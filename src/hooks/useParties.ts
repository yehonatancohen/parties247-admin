"use client";
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Party, Carousel, PartyContextType, PartyProviderInitialState } from '../data/types';
import * as api from '..//services/api';

const PartyContext = createContext<PartyContextType | undefined>(undefined);

interface PartyProviderProps {
  children: ReactNode;
  initialState?: PartyProviderInitialState;
}

export const PartyProvider: React.FC<PartyProviderProps> = ({ children, initialState }) => {
  const [allParties, setAllParties] = useState<Party[]>(() => initialState?.parties ?? []);
  const [carousels, setCarousels] = useState<Carousel[]>(() => initialState?.carousels ?? []);
  const hasInitialData = Boolean(initialState?.parties?.length || initialState?.carousels?.length);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [defaultReferral, setDefaultReferralState] = useState<string>(initialState?.defaultReferral ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const skipInitialFetch = initialState?.disableInitialFetch ?? false;

  // Filter out promotion parties for public consumption
  const parties = React.useMemo(() => {
    return allParties.filter(p => !p.tags?.includes('promotion'));
  }, [allParties]);

  // Effect for initial data load
  useEffect(() => {
    if (skipInitialFetch) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchData = async () => {
      if (!hasInitialData) {
        setIsLoading(true);
      }
      setError(null);
      setLoadingMessage(null);

      for (let i = 0; i < 4; i++) {
        try {
          const [fetchedParties, fetchedCarousels, fetchedReferral] = await Promise.all([
            api.getParties(undefined, true), // Fetch ALL parties including hidden ones
            api.getCarousels(),
            api.getDefaultReferral(),
          ]);
          if (isCancelled) {
            return;
          }
          setAllParties(fetchedParties);
          setCarousels(fetchedCarousels);
          setDefaultReferralState(fetchedReferral);
          setIsLoading(false);
          setLoadingMessage(null);
          return; // Success, exit function
        } catch (err) {
          if (err instanceof TypeError && err.message === 'Failed to fetch' && i < 3) {
            setLoadingMessage(`Server is waking up... Retrying (attempt ${i + 2}/4)`);
            await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
          } else {
            console.error('Failed to load initial data after retries', err);
            if (!isCancelled) {
              setError("Could not connect to the server. Please check your internet connection or try again later.");
              setIsLoading(false);
              setLoadingMessage(null);
            }
            return; // Failure, exit function
          }
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [skipInitialFetch, hasInitialData]);

  const addParty = useCallback(async (url: string) => {
    try {
      const newParty = await api.addParty(url);
      setAllParties(prev => [newParty, ...prev]);
      return newParty;
    } catch (error) {
      console.error("Failed to add party:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not add party.";
      alert(`Error: ${errorMessage}`);
      throw error;
    }
  }, []);


  const updateParty = useCallback(async (partyToUpdate: Party) => {
    try {
      const { id, ...partyData } = partyToUpdate;
      const updatedParty = await api.updateParty(id, partyData);
      setAllParties(prev => prev.map(p => p.id === id ? updatedParty : p));
      return updatedParty;
    } catch (error) {
      console.error("Failed to update party:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not update party.";
      alert(`Error: ${errorMessage}`);
      throw error;
    }
  }, []);


  const deleteParty = useCallback(async (partyId: string) => {
    try {
      await api.deleteParty(partyId);
      setAllParties(prev => prev.filter(p => p.id !== partyId));
      // Also remove from any carousels in the local state for immediate UI feedback.
      // The backend should handle the actual removal from its database.
      setCarousels(prev => prev.map(c => ({
        ...c,
        partyIds: c.partyIds.filter(id => id !== partyId)
      })));
    } catch (error) {
      console.error("Failed to delete party:", error);
      alert("Error: Could not delete party.");
    }
  }, []);

  const addCarousel = useCallback(async (title: string) => {
    try {
      const newCarousel = await api.addCarousel(title);
      setCarousels(prev => [...prev, newCarousel]);
    } catch (error) {
      console.error("Failed to add carousel:", error);
      alert("Error: " + (error as Error).message);
      throw error;
    }
  }, []);

  const deleteCarousel = useCallback(async (carouselId: string) => {
    try {
      await api.deleteCarousel(carouselId);
      setCarousels(prev => prev.filter(c => c.id !== carouselId));
    } catch (error) {
      console.error("Failed to delete carousel:", error);
      alert("Error: " + (error as Error).message);
      throw error;
    }
  }, []);


  const updateCarousel = useCallback(async (carouselId: string, updates: { title?: string; order?: number }) => {
    const originalCarousels = carousels;
    const carouselToUpdate = originalCarousels.find(c => c.id === carouselId);

    if (!carouselToUpdate) {
      console.error("Carousel not found for update:", carouselId);
      throw new Error("Carousel not found for update.");
    }


    // Optimistic UI update
    setCarousels(prev => prev.map(c => c.id === carouselId ? { ...c, ...updates } : c));

    try {
      const payload = {
        title: updates.title ?? carouselToUpdate.title,
        order: updates.order ?? carouselToUpdate.order,
      };

      const updatedCarousel = await api.updateCarouselInfo(carouselId, payload);
      // Sync with server response on success for consistency
      setCarousels(prev => prev.map(c => c.id === carouselId ? updatedCarousel : c));
    } catch (error) {
      console.error("Error updating carousel, rolling back.", error);
      alert("Error: " + (error as Error).message);
      // Roll back the optimistic update on failure
      setCarousels(originalCarousels);
      throw error;
    }
  }, [carousels]);

  const reorderCarousels = useCallback(async (orderedIds: string[]) => {
    const originalCarousels = carousels;
    const idToCarousel = new Map(originalCarousels.map(c => [c.id, c]));

    const reordered: Carousel[] = [];
    orderedIds.forEach((id, index) => {
      const carousel = idToCarousel.get(id);
      if (carousel) {
        reordered.push({ ...carousel, order: index });
        idToCarousel.delete(id);
      }
    });

    const remaining = Array.from(idToCarousel.values())
      .sort((a, b) => a.order - b.order)
      .map((carousel, index) => ({ ...carousel, order: reordered.length + index }));

    const newCarousels = [...reordered, ...remaining];
    setCarousels(newCarousels);

    try {
      await api.reorderCarousels(orderedIds);
    } catch (error) {
      console.error("Failed to reorder carousels, rolling back.", error);
      alert("Error: " + (error as Error).message);
      setCarousels(originalCarousels);
      throw error;
    }
  }, [carousels]);


  const addPartyToCarousel = useCallback(async (carouselId: string, partyId: string) => {
    const originalCarousels = carousels;
    const carousel = originalCarousels.find(c => c.id === carouselId);

    if (!carousel || carousel.partyIds.includes(partyId)) {
      return; // No change needed.
    }

    // Defensive check: Ensure all existing IDs in the carousel are still valid parties.
    const validExistingPartyIds = carousel.partyIds.filter(id => allParties.some(p => p.id === id));
    const updatedPartyIds = [...validExistingPartyIds, partyId];

    // Optimistically update UI.
    setCarousels(prev => prev.map(c => c.id === carouselId ? { ...c, partyIds: updatedPartyIds } : c));

    try {
      const updatedCarousel = await api.updateCarouselParties(carouselId, updatedPartyIds);
      // Sync with server's response on success for full consistency.
      setCarousels(prev => prev.map(c => c.id === carouselId ? updatedCarousel : c));
    } catch (error) {
      console.error("Error adding party to carousel, rolling back.", error);
      alert("Error: " + (error as Error).message);
      // Roll back the optimistic update on failure.
      setCarousels(originalCarousels);
      throw error;
    }
  }, [carousels, allParties]);

  const removePartyFromCarousel = useCallback(async (carouselId: string, partyId: string) => {
    const originalCarousels = carousels;
    const carousel = originalCarousels.find(c => c.id === carouselId);

    if (!carousel) {
      return; // Carousel not found, nothing to do.
    }

    const updatedPartyIds = carousel.partyIds.filter(id => id !== partyId);

    // Optimistically update UI.
    setCarousels(prev => prev.map(c => c.id === carouselId ? { ...c, partyIds: updatedPartyIds } : c));

    try {
      const updatedCarousel = await api.updateCarouselParties(carouselId, updatedPartyIds);
      // Sync with server response on success.
      setCarousels(prev => prev.map(c => c.id === carouselId ? updatedCarousel : c));
    } catch (error) {
      console.error("Error removing party from carousel, rolling back.", error);
      alert("Error: " + (error as Error).message);
      // Roll back the optimistic update on failure.
      setCarousels(originalCarousels);
      throw error;
    }
  }, [carousels]);


  const setDefaultReferral = useCallback(async (code: string) => {
    try {
      await api.setDefaultReferral(code);
      setDefaultReferralState(code);
    } catch (error) {
      console.error("Failed to set default referral:", error);
      alert("Error: Could not set default referral code.");
      throw error;
    }
  }, []);

  const cloneParty = useCallback(async (sourceSlug: string, newSlug: string, purchaseLink: string, referralCode?: string, pixelId?: string) => {
    try {
      const newParty = await api.cloneParty(sourceSlug, newSlug, purchaseLink, referralCode, pixelId);
      setAllParties(prev => [newParty, ...prev]);
      return newParty;
    } catch (error) {
      console.error("Failed to clone party:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not clone party.";
      alert(`Error: ${errorMessage}`);
      throw error;
    }
  }, []);

  const contextValue: PartyContextType = {
    allParties: allParties,
    parties: parties,
    carousels: carousels,
    addParty: addParty,
    deleteParty: deleteParty,
    updateParty: updateParty,
    addCarousel,
    deleteCarousel,
    updateCarousel,
    reorderCarousels,
    cloneParty,
    addPartyToCarousel,
    removePartyFromCarousel,
    isLoading,
    defaultReferral,
    setDefaultReferral,
    error,
    loadingMessage,
  };

  return React.createElement(
    PartyContext.Provider,
    { value: contextValue },
    children
  );
};

export const useParties = (): PartyContextType => {
  const context = useContext(PartyContext);
  if (context === undefined) {
    throw new Error('useParties must be used within a PartyProvider');
  }
  return context;
};
