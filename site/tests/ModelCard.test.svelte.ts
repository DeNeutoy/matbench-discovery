import { MODEL_METADATA, ModelCard, TRAINING_SETS } from '$lib'
import type { ModelStatLabel } from '$lib/types'
import { pretty_num } from 'elementari'
import { mount } from 'svelte'
import { describe, expect, it } from 'vitest'

describe(`ModelCard`, () => {
  // Get a real model from MODEL_METADATA
  const model = MODEL_METADATA.find((m) => m.model_key === `mace-mp-0`)
  if (!model) throw new Error(`Could not find mace-mp-0 model in MODEL_METADATA`)

  const stats: ModelStatLabel[] = [
    { key: `F1`, label: `F1 Score` },
    { key: `DAF`, label: `Discovery Acceleration Factor` },
    { key: `κ_SRME`, label: `κ SRME`, unit: `W/mK` },
  ]

  describe(`Basic Rendering`, () => {
    it(`renders model header and basic info`, () => {
      mount(ModelCard, {
        target: document.body,
        props: { model, stats, sort_by: `F1` },
      })

      const header = document.body.querySelector(`h2`)
      expect(header?.textContent).toContain(`MACE`)

      const links = document.body.querySelectorAll(`nav a`)
      expect(links.length).toBeGreaterThan(0)
      expect(links[0].href).toBe(model.repo)

      const info_spans = document.body.querySelectorAll(`section.metadata > span`)
      // Training set is now first in the metadata section, so we need to check other spans
      // Find the date_added span by its content
      const date_added_span = Array.from(info_spans).find((span) =>
        span.textContent?.includes(`Added ${model.date_added}`),
      )
      expect(date_added_span).toBeDefined()
      expect(date_added_span?.textContent).toContain(model.date_added)

      if (model.date_published) {
        const date_published_span = Array.from(info_spans).find((span) =>
          span.textContent?.includes(`Published ${model.date_published}`),
        )
        expect(date_published_span).toBeDefined()
        expect(date_published_span?.textContent).toContain(model.date_published)
      }

      const params_span = Array.from(info_spans).find((span) =>
        span.textContent?.includes(`${pretty_num(model.model_params, `.3~s`)} params`),
      )
      expect(params_span).toBeDefined()
    })

    it(`handles missing optional fields gracefully`, () => {
      const minimal_model = {
        ...model,
        date_published: undefined,
        paper: undefined,
        url: undefined,
      }

      mount(ModelCard, {
        target: document.body,
        props: { model: minimal_model, stats, sort_by: `F1` },
      })

      const links = document.body.querySelectorAll(`nav a`)
      expect(links.length).toBeGreaterThan(0)
      expect(document.body.textContent).not.toContain(`Published`)
    })
  })

  // Rest of the tests remain similar but use real_model instead of real_model
  // and adjust expectations based on actual model data...

  it(`handles training set display`, () => {
    mount(ModelCard, {
      target: document.body,
      props: { model, stats, sort_by: `F1` },
    })

    // Look for span containing "Training set" text
    const training_set = Array.from(
      document.body.querySelectorAll(`section.metadata span`),
    ).find((span) => span.textContent?.includes(`Training data`))
    expect(training_set).toBeDefined()
    expect(training_set?.textContent).toContain(`Training data:`)

    // Test actual training set data
    const training_set_links = training_set?.querySelectorAll(`a`)
    if (training_set_links) {
      const training_set_key = model.training_set[0]
      const training_set_info = TRAINING_SETS[training_set_key]

      expect(training_set_links[0].href).toBe(training_set_info.url)

      // Use pretty_num to match the actual formatted output
      const formatted_structures = pretty_num(training_set_info.n_structures)
      expect(training_set?.textContent).toContain(`${formatted_structures} structures`)
    }
  })

  describe(`Metrics Display`, () => {
    it(`displays metrics with correct formatting`, () => {
      mount(ModelCard, {
        target: document.body,
        props: { model, stats, sort_by: `F1` },
      })

      const metrics = document.body.querySelectorAll(`.metrics li`)
      expect(metrics).toHaveLength(3)

      const f1_metric = Array.from(metrics).find((m) => m.textContent?.includes(`F1`))
      const f1_value = model.metrics?.discovery?.full_test_set?.F1
      expect(f1_metric?.querySelector(`strong`)?.textContent?.trim()).toBe(
        f1_value?.toString(),
      )
      expect(f1_metric?.classList.contains(`active`)).toBe(true)

      const kappa_metric = Array.from(metrics).find((m) => m.textContent?.includes(`κ`))
      const kappa_value = model.metrics?.phonons?.kappa_103?.κ_SRME
      expect(kappa_metric?.querySelector(`strong`)?.textContent?.trim()).toBe(
        `${kappa_value} W/mK`,
      )
    })

    it(`handles missing metrics`, () => {
      const model_without_metrics = { ...model, metrics: undefined }

      mount(ModelCard, {
        target: document.body,
        props: { model: model_without_metrics, stats, sort_by: `F1` },
      })

      const metrics = document.body.querySelectorAll(`.metrics li strong`)
      expect(metrics[0].textContent?.trim()).toBe(`NaN`)
    })
  })

  describe(`Expandable Details`, () => {
    it(`toggles details section visibility`, async () => {
      let show_details = $state(false)
      mount(ModelCard, {
        target: document.body,
        props: { model, stats, sort_by: `F1`, show_details },
      })

      // Initially only metrics section should be visible
      const initial_sections = document.body.querySelectorAll(`section:not(.metrics) h3`)
      expect(initial_sections).toHaveLength(0)

      show_details = true
      const sections = document.body.querySelectorAll(`section h3`)
      const section_titles = Array.from(sections).map((h3) => h3.textContent)
      expect(section_titles).toEqual([`Metrics`])
    })

    it(`displays authors and package versions correctly`, async () => {
      mount(ModelCard, {
        target: document.body,
        props: { model, stats, sort_by: `F1`, show_details: true },
      })

      // Check author info within the list item
      const author_li = document.body.querySelector(`section:first-child ul li`)
      expect(author_li?.textContent?.trim()).toContain(model.authors[0].name)

      // Check package versions
      const packages = Array.from(
        document.body.querySelectorAll(`section:nth-child(2) li`),
      )
      expect(packages.length > 0).toBe(true)
      const first_package = Object.entries(model.requirements ?? {})[0]
      if (first_package) {
        const [pkg_name, pkg_version] = first_package
        expect(packages[0].textContent?.trim()).toBe(`${pkg_name}: ${pkg_version}`)
      }
    })
  })
})
