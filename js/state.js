// UI state shared across views (survives re-renders).
export const ui = {
  open: new Set(), // keys of <details data-key> elements the user has expanded
  dragging: false,
  houseQuery: '',
  houseState: '',
  countyState: '',
  legSort: 'close',
  benchOffice: {},
  focus: null,
  houseFilter: 'all',
  sgSort: 'close',
  mapOffice: 'senate',
  mapSel: null,
};

export const openAttr = (key) => `data-key="${key}" ${ui.open.has(key) ? 'open' : ''}`;
