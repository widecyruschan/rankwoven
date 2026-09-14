import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getSiteConnections, type SiteConnection } from '../api/siteConnections';

const selectedSiteStorageKey = 'rankwoven_current_site_id';

function getStoredSiteId() {
  return localStorage.getItem(selectedSiteStorageKey) ?? '';
}

export const useSiteStore = defineStore('site', () => {
  const sites = ref<SiteConnection[]>([]);
  const selectedSiteId = ref(getStoredSiteId());
  const isLoading = ref(false);
  const selectedSite = computed(() => sites.value.find((site) => site.id === selectedSiteId.value));

  function selectSite(siteId: string) {
    selectedSiteId.value = siteId;
    if (siteId) {
      localStorage.setItem(selectedSiteStorageKey, siteId);
    } else {
      localStorage.removeItem(selectedSiteStorageKey);
    }
  }

  async function refreshSites() {
    isLoading.value = true;
    try {
      const result = await getSiteConnections();
      sites.value = result.sites.filter((site) => site.status === 'connected');
      if (!sites.value.some((site) => site.id === selectedSiteId.value)) {
        selectSite(sites.value[0]?.id ?? '');
      }
      return sites.value;
    } finally {
      isLoading.value = false;
    }
  }

  function clear() {
    sites.value = [];
    selectSite('');
  }

  return { sites, selectedSiteId, selectedSite, isLoading, selectSite, refreshSites, clear };
});
