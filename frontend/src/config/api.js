// Central API configuration — pointing to deployed Render backend by default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Health
    health: '/api/health',

    // Expeditions
    expeditions:       '/api/expeditions',
    expeditionById:    (id) => `/api/expeditions/${id}`,
    expeditionFull:    (id) => `/api/expeditions/${id}/full`,
    integrityCheck:    '/api/expeditions/integrity-check',

    // Reports (PDF) — mounted under /api/expeditions prefix
    uploadReport:      (expeditionId) => `/api/expeditions/${expeditionId}/reports`,
    reportById:        (id) => `/api/files/reports/${id}`,
    deleteReport:      (id) => `/api/expeditions/${id}`,

    // Datasets
    datasets:          '/api/datasets',
    datasetById:       (id) => `/api/datasets/${id}`,
    datasetPreview:    (id) => `/api/datasets/${id}/preview`,
    datasetFile:       (id) => `/api/files/datasets/${id}`,
    deleteDataset:     (id) => `/api/datasets/${id}`,

    // Publications
    publications:      '/api/publications',
    publicationById:   (id) => `/api/publications/${id}`,
    publicationFile:   (id) => `/api/files/publications/${id}`,
    deletePublication: (id) => `/api/publications/${id}`,

    // Media (photos/videos) — mounted under /api/expeditions prefix
    uploadMedia:       (expeditionId) => `/api/expeditions/${expeditionId}/media`,
    mediaFile:         (id) => `/api/files/media/${id}`,
    mediaThumbnail:    (id) => `/api/files/media/${id}/thumbnail`,
    deleteMedia:       (id) => `/api/expeditions/${id}/media`,

    // Institutional Activities
    activities:        '/api/activities',
    activityById:      (id) => `/api/activities/${id}`,

    // AI Content Generation
    generateContent:   (expeditionId) => `/api/generated/generate/${expeditionId}`,
    generateItemContent: (type, id) => `/api/generated/generate/item/${type}/${id}`,
    generatedByExpedition: (expeditionId) => `/api/generated/expedition/${expeditionId}/content`,
    generatedByItem: (type, id) => `/api/generated/item/${type}/${id}/content`,
    generatedItemById: (id) => `/api/generated/generated-content/${id}`,
    updateGenerated:   (id) => `/api/generated/generated-content/${id}`,
    updateGeneratedStatus: (id) => `/api/generated/generated-content/${id}/status`,
    publicGenerated:   '/api/generated/public',

    login:              '/api/auth/login',
    register:           '/api/auth/register',
    registerResearcher: '/api/auth/register-researcher',
    googleLogin:        '/api/auth/google-login',
    google:             '/api/auth/google',
    getMe:              '/api/auth/me',
    researchers:        '/api/auth/researchers',
    approveResearcher:  (id) => `/api/auth/researchers/${id}/approve`,
    rejectResearcher:   (id) => `/api/auth/researchers/${id}/reject`,
  }
};

export default API_CONFIG;
