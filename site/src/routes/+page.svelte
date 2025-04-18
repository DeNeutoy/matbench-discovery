<script lang="ts">
  import type { DiscoverySet, ModelData } from '$lib'
  import {
    MetricScatter,
    MetricsTable,
    model_is_compliant,
    MODEL_METADATA,
    RadarChart,
  } from '$lib'
  import { generate_png, generate_svg, handle_export } from '$lib/html-to-img'
  import {
    ALL_METRICS,
    DEFAULT_COMBINED_METRIC_CONFIG,
    DISCOVERY_SET_LABELS,
    F1_DEFAULT_WEIGHT,
    KAPPA_DEFAULT_WEIGHT,
    METADATA_COLS,
    RMSD_DEFAULT_WEIGHT,
  } from '$lib/metrics'
  import Readme from '$root/readme.md'
  import KappaNote from '$site/src/routes/kappa-note.md'
  import { pretty_num } from 'elementari'
  import { Tooltip } from 'svelte-zoo'

  let n_wbm_stable_uniq_protos = 32_942
  let n_wbm_uniq_protos = 215_488

  let show_non_compliant: boolean = $state(true)
  let show_energy_only: boolean = $state(false)
  let show_combined_controls: boolean = $state(true)
  let export_error: string | null = $state(null)

  // State for the radar chart
  let metric_config = $state({ ...DEFAULT_COMBINED_METRIC_CONFIG })

  // Default column visibility
  let visible_cols: Record<string, boolean> = $state({
    ...Object.fromEntries(
      [...ALL_METRICS, ...METADATA_COLS].map((col) => [col.label, true]),
    ),
    TPR: false,
    TNR: false,
    RMSE: false,
  })

  let best_model = $derived(
    MODEL_METADATA.reduce((best, md: ModelData) => {
      const best_F1 = best.metrics?.discovery?.full_test_set?.F1 ?? 0
      const md_F1 = md.metrics?.discovery?.full_test_set?.F1 ?? 0
      if (
        (!best_F1 || md_F1 > best_F1) &&
        (show_non_compliant || model_is_compliant(md))
      ) {
        return md
      }
      return best
    }, {} as ModelData),
  )

  let discovery_set: DiscoverySet = $state(`unique_prototypes`)

  // Reset to default weights (50% F1, 40% kappa, 10% RMSD)
  function reset_weights() {
    // Create a new array with updated values
    const new_weights = [...metric_config.weights]

    // Find the indices of each metric using the correct metric names
    const f1_index = new_weights.findIndex((w) => w.metric === `F1`)
    const kappa_index = new_weights.findIndex((w) => w.metric === `kappa_SRME`)
    const rmsd_index = new_weights.findIndex((w) => w.metric === `RMSD`)

    if (f1_index >= 0 && kappa_index >= 0 && rmsd_index >= 0) {
      // Set the desired weight distribution
      new_weights[f1_index].value = F1_DEFAULT_WEIGHT
      new_weights[kappa_index].value = KAPPA_DEFAULT_WEIGHT
      new_weights[rmsd_index].value = RMSD_DEFAULT_WEIGHT

      // Create a completely new config object to force reactivity
      metric_config = {
        ...metric_config,
        weights: new_weights.map((w) => ({ ...w })), // Deep clone weights
      }
    } else {
      console.error(`Couldn't find expected metrics in weights array`, {
        weights: metric_config.weights,
        expected: [`F1`, `kappa_SRME`, `RMSD`],
      })
    }
  }
</script>

<Readme>
  {#snippet metrics_table()}
    <figure style="margin-top: 3em;" id="metrics-table">
      <div class="discovery-set-toggle">
        {#each Object.entries(DISCOVERY_SET_LABELS) as [key, { title, tooltip, link }] (key)}
          <Tooltip text={tooltip} tip_style="z-index: 2; font-size: 0.8em;">
            <button
              class:active={discovery_set === key}
              onclick={() => (discovery_set = key as DiscoverySet)}
            >
              {title}
              {#if link}
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Info"
                  style="line-height: 1;"
                >
                  ⓘ
                </a>
              {/if}
            </button>
          </Tooltip>
        {/each}
      </div>

      <section class="table-wrapper">
        <div>
          <MetricsTable
            col_filter={(col) => visible_cols[col.label] ?? true}
            model_filter={() => true}
            {discovery_set}
            {show_combined_controls}
            {show_energy_only}
            show_noncompliant={show_non_compliant}
            config={metric_config}
            style="width: 100%;"
          />
        </div>
      </section>

      <div class="downloads">
        Download table as
        {#each [[`SVG`, generate_svg], [`PNG`, generate_png]] as const as [label, generate_fn] (label)}
          <button
            class="download-btn"
            onclick={handle_export(generate_fn, label, export_error, {
              show_non_compliant,
              discovery_set,
            })}
          >
            {label}
          </button>
        {/each}
        {#if export_error}
          <div class="export-error">
            {export_error}
          </div>
        {/if}
      </div>

      <!-- Radar Chart and Caption Container -->
      <figcaption class="caption-radar-container">
        <div
          style="flex: 1; background-color: var(--light-bg); padding: 0.2em 0.5em; border-radius: 4px;"
        >
          The <strong>CPS</strong> (Combined Performance Score) is a metric that weights
          discovery performance (F1), geometry optimization quality (RMSD), and thermal
          conductivity prediction accuracy (κ<sub>SRME</sub>). Use the radar chart to
          adjust the importance of each metric component.
          <br /><br />
          Training size is the number of materials used to train the model. For models trained
          on DFT relaxations, we show the number of distinct frames in parentheses). In cases
          where only the number of frames is known, we report the number of frames as the training
          set size. <code>(N=x)</code> in the Model Params column shows the number of
          estimators if an ensemble was used. DAF = Discovery Acceleration Factor measures
          how many more stable materials a model finds compared to random selection from
          the test set. The unique structure prototypes in the WBM test set have a
          <code>{pretty_num(n_wbm_stable_uniq_protos / n_wbm_uniq_protos, `.1%`)}</code>
          rate of stable crystals, meaning the max possible DAF is
          <code
            >({pretty_num(n_wbm_stable_uniq_protos)} / {pretty_num(n_wbm_uniq_protos)})^−1
            ≈
            {pretty_num(n_wbm_uniq_protos / n_wbm_stable_uniq_protos)}</code
          >.
        </div>

        <!-- Radar Chart for Weight Controls -->
        <div class="radar-container">
          <div class="radar-header">
            <span class="metric-name">{metric_config.name}</span>
            <Tooltip>
              <span class="info-icon">ⓘ</span>
              {#snippet tip()}
                {@html metric_config.description}
              {/snippet}
            </Tooltip>

            <button
              class="action-button"
              onclick={reset_weights}
              title="Reset to default weights"
            >
              Reset
            </button>
          </div>
          <RadarChart
            weights={metric_config.weights}
            onchange={(weights) => {
              metric_config = {
                ...metric_config,
                weights: weights.map((w) => ({ ...w })),
              }
            }}
            size={260}
          />
        </div>

        {#each [{ metric: `discovery.unique_prototypes.F1`, y_label: `F1 Score`, y_lim: [0, 1], better: `higher` }, { metric: `phonons.kappa_103.κ_SRME`, y_label: `κ<sub>SRME</sub>`, y_lim: [0, 2], better: `lower` }] as { metric, y_label, y_lim, better } (metric)}
          {@const style = `width: 100%; height: 300px;`}
          <section style="width: 100%;">
            <h3>
              {@html y_label} over time
              <small style="font-weight: lighter;">({better} = better)</small>
            </h3>
            <MetricScatter models={MODEL_METADATA} {metric} {y_label} {style} {y_lim} />
          </section>
        {/each}
      </figcaption>
    </figure>
  {/snippet}

  {#snippet model_count()}
    {MODEL_METADATA.filter((md) => show_non_compliant || model_is_compliant(md)).length}
  {/snippet}

  {#snippet best_report()}
    {#if best_model}
      {@const { model_name, model_key, repo, paper, metrics = {} } = best_model}
      {@const { F1, R2, DAF } = metrics?.discovery?.[discovery_set] ?? {}}
      <span id="best-report">
        <a href="/models/{model_key}">{model_name}</a> (<a href={paper}>paper</a>,
        <a href={repo}>code</a>) achieves the highest F1 score of {F1}, R<sup>2</sup> of {R2}
        and a discovery acceleration factor (DAF) of {DAF}
        (i.e. a ~{Number(DAF).toFixed(1)}x higher rate of stable structures compared to
        dummy discovery in the already enriched test set containing 16% stable materials).
      </span>
    {/if}
  {/snippet}
</Readme>
<KappaNote />
{#await import(`$site/src/routes/landing-page-figs.md`) then LandingPageFigs}
  <LandingPageFigs.default />
{/await}

<style>
  figure {
    margin: 0;
    display: grid;
    gap: 1ex;
  }
  /* Table wrapper for full-width placement */
  .table-wrapper {
    /* Use negative margin technique for full width */
    width: calc(100vw - 20px);
    margin-left: calc(-50vw + 50% + 10px);
    display: flex;
    justify-content: center;
  }
  figcaption {
    font-size: 0.9em;
    padding: 2pt 6pt;
    background-color: rgba(255, 255, 255, 0.06);
  }
  .discovery-set-toggle {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5pt;
    margin-bottom: 5pt;
  }
  .discovery-set-toggle button {
    padding: 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: transparent;
  }
  .discovery-set-toggle button:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .discovery-set-toggle button.active {
    background: rgba(255, 255, 255, 0.1);
  }
  div.downloads {
    display: flex;
    flex-wrap: wrap;
    gap: 1ex;
    justify-content: center;
    margin-block: 1ex;
    align-items: center;
  }
  div.downloads .download-btn {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 0 6pt;
    border-radius: 4pt;
    font: inherit;
  }
  div.export-error {
    color: #ff6b6b;
    margin-top: 0.5em;
    flex-basis: 100%;
  }

  /* Caption Radar Container Styles */
  figcaption.caption-radar-container {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1em;
    background-color: transparent;
  }

  .radar-container {
    width: fit-content;
    flex: 0 0 auto;
    max-width: 100%;
    background: var(--light-bg);
    border-radius: 4px;
    padding: 0.1em 0.3em;
    box-sizing: border-box;
  }

  .radar-header {
    display: flex;
    align-items: center;
    gap: 6pt;
    font-weight: bold;
  }

  .info-icon {
    opacity: 0.7;
    cursor: help;
  }

  .action-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    cursor: pointer;
    padding: 0.15em 0.35em;
    font-size: 0.8em;
    margin-left: auto;
  }

  .action-button:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  figure#metrics-table :global(:is(sub, sup)) {
    font-size: 0.7em;
  }
</style>
