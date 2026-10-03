// Verified real polar and cryospheric statistics from NCPOR (National Centre for Polar and Ocean Research),
// Ministry of Earth Sciences (MoES, Govt. of India), and the Scientific Committee on Antarctic Research (SCAR).
import { stations } from './stations';

export const verifiedFacts = {
  antarcticExpeditions: {
    value: 45,
    label: "Antarctic Expeditions",
    shortLabel: "Antarctic Exp.",
    note: "Since 1981 (45th Indian Scientific Expedition to Antarctica, 2025-26)",
    source: "NCPOR Public Record (45th ISEA, 2025-26)",
    sourceUrl: "https://ncpor.res.in/news/view/815"
  },
  arcticExpeditions: {
    value: 18,
    label: "Arctic Expeditions",
    shortLabel: "Arctic Exp.",
    note: "Since 2007 (Continuous Indian Arctic Research Programme at Ny-Ålesund, Svalbard)",
    source: "NCPOR Arctic Research Programme",
    sourceUrl: "https://ncpor.res.in"
  },
  southernOceanExpeditions: {
    value: 13,
    label: "Southern Ocean Expeditions",
    shortLabel: "Southern Ocean",
    note: "Since 2004 (Special scientific cruises onboard dedicated research vessels)",
    source: "NCPOR Southern Ocean Studies",
    sourceUrl: "https://ncpor.res.in"
  },
  activeStations: {
    get value() {
      // 3 permanent year-round operational polar research bases: Maitri & Bharati (Antarctica) and Himadri (Arctic)
      return stations.filter(s => s.status === 'active' && ['maitri', 'bharati', 'himadri'].includes(s.id)).length;
    },
    label: "Active Polar Bases",
    shortLabel: "Active Bases",
    note: "Maitri & Bharati (Antarctica), Himadri (Arctic)",
    source: "NCPOR Operational Antarctic & Arctic Research Bases",
    sourceUrl: "https://ncpor.res.in"
  },
  totalPolarObservatories: {
    get value() {
      return stations.length;
    },
    label: "Polar Observatories & Bases",
    shortLabel: "Observatories",
    note: "Verified polar stations, glaciological observatories, and sub-sea moorings across Antarctica, Arctic, Himalayas, and Southern Ocean",
    source: "NCPOR, MoES, BAS, AWI, NSF, NPI Polar Research Networks",
    sourceUrl: "https://ncpor.res.in"
  },
  programmeStart: {
    value: 1981,
    label: "Programme Inception",
    note: "Since 1981 (First Indian Antarctic Expedition led by Dr. S.Z. Qasim)",
    source: "Ministry of Earth Sciences, Govt. of India"
  }
};

export default verifiedFacts;
