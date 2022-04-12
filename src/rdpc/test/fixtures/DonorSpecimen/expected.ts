import {
  SamplePair,
  StringMap,
  TumourNormalDesignationValue,
} from "rdpc/types";

export const matchedSamplePairs_expected = {
  DO35140: [
    {
      normalSample: {
        specimenId: "SP78096",
        tumourNormalDesignation: "Normal",
        submitterSampleId: "PCSI_0085_Ly_R",
        matchedNormalSubmitterSampleId: "",
        firstPublishedAt: "1607715342567",
        experimentStrategy: "WGS",
      },
      tumourSample: {
        specimenId: "SP77876",
        tumourNormalDesignation: "Tumour",
        submitterSampleId: "PCSI_0085_Pa_P",
        matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
        firstPublishedAt: "1699715342567",
        experimentStrategy: "WGS",
      },
      firstPublishedAt: 1699715342567,
    },
    {
      normalSample: {
        specimenId: "SP113860",
        tumourNormalDesignation: "Normal",
        submitterSampleId: "PCSI_0085_Sp_R",
        matchedNormalSubmitterSampleId: "",
        firstPublishedAt: "1607919342900",
        experimentStrategy: "WGS",
      },
      tumourSample: {
        specimenId: "SP125687",
        tumourNormalDesignation: "Tumour",
        submitterSampleId: "PCSI_0085_Pa_P_526",
        matchedNormalSubmitterSampleId: "PCSI_0085_Sp_R",
        firstPublishedAt: "1607715342567",
        experimentStrategy: "WGS",
      },
      firstPublishedAt: 1607919342900,
    },
  ],
};

export const mergedPages_expected = {
  DO35140: {
    donorId: "DO35140",
    specimen: [
      {
        specimenId: "SP113860",
        tumourNormalDesignation: "Normal",
        samples: [
          {
            submitterSampleId: "PCSI_0085_Sp_R",
            matchedNormalSubmitterSampleId: null,
          },
        ],
      },
      {
        specimenId: "SP77876",
        tumourNormalDesignation: "Tumour",
        samples: [
          {
            submitterSampleId: "PCSI_0085_Pa_X",
            matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
          },
        ],
      },
      {
        specimenId: "SP77876",
        tumourNormalDesignation: "Tumour",
        samples: [
          {
            submitterSampleId: "PCSI_0085_Pa_P",
            matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
          },
        ],
      },
      {
        specimenId: "SP78096",
        tumourNormalDesignation: "Normal",
        samples: [
          {
            submitterSampleId: "PCSI_0085_Ly_R",
            matchedNormalSubmitterSampleId: null,
          },
        ],
      },
      {
        specimenId: "SP77876",
        tumourNormalDesignation: "Tumour",
        samples: [
          {
            submitterSampleId: "PCSI_0085_Pa_P",
            matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
          },
        ],
      },
      {
        specimenId: "SP125687",
        tumourNormalDesignation: "Tumour",
        samples: [
          {
            submitterSampleId: "PCSI_0085_Pa_P_526",
            matchedNormalSubmitterSampleId: "PCSI_0085_Sp_R",
          },
        ],
      },
    ],
    samplePairs: [
      {
        normalSample: {
          specimenId: "SP113860",
          tumourNormalDesignation: "Normal",
          submitterSampleId: "PCSI_0085_Sp_R",
          matchedNormalSubmitterSampleId: "",
          firstPublishedAt: "1607715342567",
          experimentStrategy: "WGS",
        },
        firstPublishedAt: 1607715342567,
      },
      {
        tumourSample: {
          specimenId: "SP77876",
          tumourNormalDesignation: "Tumour",
          submitterSampleId: "PCSI_0085_Pa_X",
          matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
          firstPublishedAt: "1607715342567",
          experimentStrategy: "WXS",
        },
        firstPublishedAt: 1607715342567,
      },
      {
        tumourSample: {
          specimenId: "SP77876",
          tumourNormalDesignation: "Tumour",
          submitterSampleId: "PCSI_0085_Pa_P",
          matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
          firstPublishedAt: "1607715342567",
          experimentStrategy: "WXS",
        },
        firstPublishedAt: 1607715342567,
      },
      {
        normalSample: {
          specimenId: "SP78096",
          tumourNormalDesignation: "Normal",
          submitterSampleId: "PCSI_0085_Ly_R",
          matchedNormalSubmitterSampleId: "",
          firstPublishedAt: "1607715342567",
          experimentStrategy: "WGS",
        },
        firstPublishedAt: 1607715342567,
      },
      {
        tumourSample: {
          specimenId: "SP77876",
          tumourNormalDesignation: "Tumour",
          submitterSampleId: "PCSI_0085_Pa_P",
          matchedNormalSubmitterSampleId: "PCSI_0085_Ly_R",
          firstPublishedAt: "1607715342567",
          experimentStrategy: "WGS",
        },
        firstPublishedAt: 1607715342567,
      },
      {
        tumourSample: {
          specimenId: "SP125687",
          tumourNormalDesignation: "Tumour",
          submitterSampleId: "PCSI_0085_Pa_P_526",
          matchedNormalSubmitterSampleId: "PCSI_0085_Sp_R",
          firstPublishedAt: "1607715342567",
          experimentStrategy: "WGS",
        },
        firstPublishedAt: 1607715342567,
      },
    ],
  },
};

export const donorsWithEarliestPair_expected: StringMap<SamplePair> = {
  DO35140: {
    normalSample: {
      specimenId: "SP113860",
      tumourNormalDesignation: TumourNormalDesignationValue.Normal,
      submitterSampleId: "PCSI_0085_Sp_R",
      matchedNormalSubmitterSampleId: "",
      firstPublishedAt: "1607715342567",
      experimentStrategy: "WGS",
      sampleType: "Total DNA",
    },
    tumourSample: {
      specimenId: "SP77876",
      tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
      submitterSampleId: "PCSI_0085_Pa_P_526",
      matchedNormalSubmitterSampleId: "PCSI_0085_Sp_R",
      firstPublishedAt: "1609715342567",
      experimentStrategy: "WGS",
      sampleType: "Total DNA",
    },
    firstPublishedAt: 1609715342567,
  },
  DO35141: {
    normalSample: {
      specimenId: "SP113860",
      tumourNormalDesignation: TumourNormalDesignationValue.Normal,
      submitterSampleId: "PCSI_0085_Sp_0",
      matchedNormalSubmitterSampleId: "",
      firstPublishedAt: "1607715342567",
      experimentStrategy: "WGS",
      sampleType: "Total DNA",
    },
    tumourSample: {
      specimenId: "SP77876",
      tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
      submitterSampleId: "PCSI_0085_Pa_P_22",
      matchedNormalSubmitterSampleId: "PCSI_0085_Sp_0",
      firstPublishedAt: "1619715342567",
      experimentStrategy: "WGS",
      sampleType: "Total DNA",
    },
    firstPublishedAt: 1619715342567,
  },
};
