## Installation

The recommended way to use this benchmark is through its Python package [available onPyPI](https://pypi.org/project/matbench-discovery):

```zsh
pip install matbench-discovery
```

## Usage

Here's an example script of how to download the training and test set files for training a new model, recording the results and submitting them via pull request to this benchmark:

<!-- TODO remove notest meta key once repo is public and file can be downloaded without token -->

```py notest
from matbench_discovery.data import load_train_test
from matbench_discovery.data import df_wbm

df_wbm = load_train_test("wbm-summary", version="v1.0.0")

assert df_wbm.shape == (256963, 17)

assert list(df_wbm) == ['formula', 'n_sites', 'volume', 'uncorrected_energy', 'e_form_per_atom_wbm', 'e_hull_wbm', 'bandgap_pbe', 'uncorrected_energy_from_cse', 'e_correction_per_atom_legacy', 'e_correction_per_atom_mp2020', 'e_above_hull_uncorrected_ppd_mp', 'e_above_hull_mp2020_corrected_ppd_mp', 'e_above_hull_legacy_corrected_ppd_mp', 'e_form_per_atom_uncorrected', 'e_form_per_atom_mp2020_corrected', 'e_form_per_atom_legacy_corrected', 'wyckoff_spglib']
```

Column glossary

1. `formula`: A compound's unreduced alphabetical formula
1. `n_sites`: Number of sites in the structure's unit cell
1. `volume`: Relaxed structure volume in cubic Angstrom
1. `uncorrected_energy`: Raw VASP-computed energy
1. `e_form_per_atom_wbm`: Original formation energy per atom from [WBM paper]
1. `e_hull_wbm`: Original energy above the convex hull in (eV/atom) from [WBM paper]
1. `bandgap_pbe`: PBE-level DFT band gap from [WBM paper]
1. `uncorrected_energy_from_cse`: Should be the same as `uncorrected_energy`. There are 2 cases where the absolute difference reported in the summary file and in the computed structure entries exceeds 0.1 eV (`wbm-2-3218`, `wbm-1-56320`) which we attribute to rounding errors.
1. `e_form_per_atom_mp2020_corrected`: Matbench Discovery takes these as ground truth for the formation energy. Includes MP2020 energy corrections (latest correction scheme at time of release).
1. `e_above_hull_mp2020_corrected_ppd_mp`: Energy above hull distances in eV/atom after applying the MP2020 correction scheme and with respect to the Materials Project convex hull. Matbench Discovery takes these as ground truth for material stability. Any value above 0 is assumed to be an unstable/metastable material.
<!-- TODO document remaining columns, or maybe drop them from df -->

## Direct Download

You can also download the data files directly:

1. [`2022-10-19-wbm-summary.csv`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-10-19-wbm-summary.csv) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-10-19-wbm-summary.csv)]: Computed material properties only, no structures. Available properties are VASP energy, formation energy, energy above the convex hull, volume, band gap, number of sites per unit cell, and more. e_form_per_atom and e_above_hull each have 3 separate columns for old, new and no Materials
1. [`2022-10-19-wbm-init-structs.json`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-10-19-wbm-init-structs.json) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-10-19-wbm-init-structs.json)]: Unrelaxed WBM structures
1. [`2022-10-19-wbm-cses.json`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-10-19-wbm-cses.json) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-10-19-wbm-cses.json)]: Relaxed WBM structures along with final VASP energies
1. [`2022-08-13-mp-energies.json.gz`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-08-13-mp-energies.json.gz) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-08-13-mp-energies.json.gz)]: Materials Project formation energies and energies above convex hull
1. [`2022-09-16-mp-computed-structure-entries.json.gz`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-09-16-mp-computed-structure-entries.json.gz) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-09-16-mp-computed-structure-entries.json.gz)]: Materials Project computed structure entries
1. [`2022-09-18-ppd-mp.pkl.gz`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-09-18-ppd-mp.pkl.gz) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-09-18-ppd-mp.pkl.gz)]: [PatchedPhaseDiagram](https://pymatgen.org/pymatgen.analysis.phase_diagram.html#pymatgen.analysis.phase_diagram.PatchedPhaseDiagram) constructed from all MP ComputedStructureEntries
1. [`2022-09-19-mp-elemental-ref-energies.json`](https://github.com/janosh/matbench-discovery/raw/v1.0.0/data/wbm/2022-09-19-mp-elemental-ref-energies.json) [[GitHub](https://github.com/janosh/matbench-discovery/blob/v1/data/wbm/2022-09-19-mp-elemental-ref-energies.json)]: Minimum energy PDEntries for each element present in the Materials Project

[wbm paper]: https://nature.com/articles/s41524-020-00481-6