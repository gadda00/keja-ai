/**
 * Tokenize Store
 * 
 * Manages fractional ownership (tokenization) state, investments, and portfolio.
 * This store replaces the existing tokenizeStore.tsx with a Zustand-based implementation.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { localStorageAdapter } from './useStore';

// Types
export type TokenStatus = 'available' | 'reserved' | 'sold' | 'cancelled';
export type InvestmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type DistributionType = 'rental' | 'dividend' | 'capital_gain';

interface Token {
  id: string;
  propertyId: string;
  tokenNumber: number;
  totalTokens: number;
  pricePerToken: number;
  currency: 'KES' | 'USD';
  status: TokenStatus;
  ownerId: string | null;
  purchasedAt: string | null;
  reservationExpiresAt: string | null;
}

interface Investment {
  id: string;
  userId: string;
  propertyId: string;
  tokenIds: string[];
  amountInvested: number;
  currency: 'KES' | 'USD';
  tokensPurchased: number;
  status: InvestmentStatus;
  createdAt: string;
  confirmedAt: string | null;
  transactionHash: string | null;
}

interface Distribution {
  id: string;
  propertyId: string;
  type: DistributionType;
  amountPerToken: number;
  currency: 'KES' | 'USD';
  distributionDate: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string;
}

interface PortfolioSummary {
  totalInvested: number;
  totalTokens: number;
  propertiesOwned: number;
  estimatedValue: number;
  unrealizedGains: number;
  allTimeROI: number;
}

interface TokenizeState {
  // Tokens
  tokens: Token[];
  tokensByProperty: Record<string, Token[]>;
  
  // Investments
  investments: Investment[];
  investmentsByUser: Record<string, Investment[]>;
  
  // Distributions
  distributions: Distribution[];
  distributionsByProperty: Record<string, Distribution[]>;
  
  // Portfolio
  portfolio: PortfolioSummary;
  
  // Current selection
  selectedPropertyForInvestment: string | null;
  selectedTokens: string[];
  
  // KYC state
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  kycData: Record<string, unknown> | null;
  
  // Transaction state
  isProcessing: boolean;
  processingMessage: string | null;
  lastError: string | null;
  
  // Secondary market
  marketOrders: MarketOrder[];
}

interface MarketOrder {
  id: string;
  userId: string;
  tokenId: string;
  propertyId: string;
  type: 'buy' | 'sell';
  pricePerToken: number;
  quantity: number;
  currency: 'KES' | 'USD';
  status: 'open' | 'filled' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
}

interface TokenizeActions {
  // Token actions
  initializeTokensForProperty: (propertyId: string, totalTokens: number, pricePerToken: number) => void;
  reserveToken: (tokenId: string, userId: string) => void;
  purchaseToken: (tokenId: string, userId: string, paymentDetails: any) => Promise<string>;
  releaseTokenReservation: (tokenId: string) => void;
  cancelTokenPurchase: (tokenId: string) => void;
  
  // Investment actions
  createInvestment: (userId: string, propertyId: string, tokenIds: string[], amount: number) => Promise<Investment>;
  confirmInvestment: (investmentId: string, transactionHash: string) => void;
  cancelInvestment: (investmentId: string) => void;
  
  // Distribution actions
  createDistribution: (propertyId: string, type: DistributionType, amountPerToken: number, date: string) => void;
  markDistributionAsPaid: (distributionId: string) => void;
  
  // Portfolio actions
  calculatePortfolioSummary: (userId: string) => PortfolioSummary;
  updatePortfolio: () => void;
  
  // Selection actions
  selectPropertyForInvestment: (propertyId: string | null) => void;
  selectToken: (tokenId: string) => void;
  deselectToken: (tokenId: string) => void;
  clearSelectedTokens: () => void;
  
  // KYC actions
  startKYC: () => void;
  submitKYCData: (data: Record<string, unknown>) => Promise<void>;
  verifyKYC: (verificationData: any) => void;
  rejectKYC: (reason: string) => void;
  
  // Market actions
  createOrder: (userId: string, tokenId: string, propertyId: string, type: 'buy' | 'sell', price: number, quantity: number) => MarketOrder;
  cancelOrder: (orderId: string) => void;
  fillOrder: (orderId: string, buyerId: string) => void;
  
  // Utility
  getTokensForProperty: (propertyId: string) => Token[];
  getAvailableTokensForProperty: (propertyId: string) => Token[];
  getUserTokens: (userId: string) => Token[];
  getUserInvestments: (userId: string) => Investment[];
  getPropertyInvestors: (propertyId: string) => Investment[];
  getTokenById: (tokenId: string) => Token | undefined;
  getInvestmentById: (investmentId: string) => Investment | undefined;
  getUserPortfolio: (userId: string) => PortfolioSummary;
  
  // State management
  setProcessing: (isProcessing: boolean, message?: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialState: TokenizeState = {
  tokens: [],
  tokensByProperty: {},
  investments: [],
  investmentsByUser: {},
  distributions: [],
  distributionsByProperty: {},
  portfolio: {
    totalInvested: 0,
    totalTokens: 0,
    propertiesOwned: 0,
    estimatedValue: 0,
    unrealizedGains: 0,
    allTimeROI: 0,
  },
  selectedPropertyForInvestment: null,
  selectedTokens: [],
  kycStatus: 'not_started',
  kycData: null,
  isProcessing: false,
  processingMessage: null,
  lastError: null,
  marketOrders: [],
};

export const useTokenizeStore = create<TokenizeState & TokenizeActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        initializeTokensForProperty: (propertyId, totalTokens, pricePerToken) => {
          const newTokens: Token[] = [];
          
          for (let i = 1; i <= totalTokens; i++) {
            newTokens.push({
              id: `${propertyId}-T${i.toString().padStart(6, '0')}`,
              propertyId,
              tokenNumber: i,
              totalTokens,
              pricePerToken,
              currency: 'KES',
              status: 'available',
              ownerId: null,
              purchasedAt: null,
              reservationExpiresAt: null,
            });
          }
          
          set((state) => ({
            tokens: [...state.tokens, ...newTokens],
            tokensByProperty: {
              ...state.tokensByProperty,
              [propertyId]: newTokens,
            },
          }));
        },
        
        reserveToken: (tokenId, userId) => {
          set((state) => ({
            tokens: state.tokens.map((token) =>
              token.id === tokenId
                ? {
                    ...token,
                    status: 'reserved',
                    ownerId: userId,
                    reservationExpiresAt: new Date(
                      Date.now() + 15 * 60 * 1000,
                    ).toISOString(),
                  }
                : token
            ),
          }));
        },
        
        purchaseToken: async (tokenId, userId, paymentDetails) => {
          get().setProcessing(true, 'Processing purchase...');
          
          // Simulate async processing
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
          
          set((state) => ({
            tokens: state.tokens.map((token) =>
              token.id === tokenId
                ? {
                    ...token,
                    status: 'sold',
                    ownerId: userId,
                    purchasedAt: new Date().toISOString(),
                    reservationExpiresAt: null,
                  }
                : token
            ),
            isProcessing: false,
            processingMessage: null,
          }));
          
          // Create investment
          const token = get().getTokenById(tokenId);
          if (token) {
            await get().createInvestment(
              userId,
              token.propertyId,
              [tokenId],
              token.pricePerToken,
            );
          }
          
          get().updatePortfolio();
          
          return transactionHash;
        },
        
        releaseTokenReservation: (tokenId) => {
          set((state) => ({
            tokens: state.tokens.map((token) =>
              token.id === tokenId
                ? {
                    ...token,
                    status: 'available',
                    ownerId: null,
                    purchasedAt: null,
                    reservationExpiresAt: null,
                  }
                : token
            ),
          }));
        },
        
        cancelTokenPurchase: (tokenId) => {
          set((state) => ({
            tokens: state.tokens.map((token) =>
              token.id === tokenId && token.status === 'reserved'
                ? {
                    ...token,
                    status: 'available',
                    ownerId: null,
                    purchasedAt: null,
                    reservationExpiresAt: null,
                  }
                : token
            ),
          }));
        },
        
        createInvestment: async (userId, propertyId, tokenIds, amount) => {
          const newInvestment: Investment = {
            id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            userId,
            propertyId,
            tokenIds,
            amountInvested: amount * tokenIds.length,
            currency: 'KES',
            tokensPurchased: tokenIds.length,
            status: 'pending',
            createdAt: new Date().toISOString(),
            confirmedAt: null,
            transactionHash: null,
          };
          
          set((state) => ({
            investments: [...state.investments, newInvestment],
            investmentsByUser: {
              ...state.investmentsByUser,
              [userId]: [
                ...(state.investmentsByUser[userId] || []),
                newInvestment,
              ],
            },
          }));
          
          return newInvestment;
        },
        
        confirmInvestment: (investmentId, transactionHash) => {
          set((state) => ({
            investments: state.investments.map((inv) =>
              inv.id === investmentId
                ? {
                    ...inv,
                    status: 'confirmed',
                    confirmedAt: new Date().toISOString(),
                    transactionHash,
                  }
                : inv
            ),
          }));
        },
        
        cancelInvestment: (investmentId) => {
          set((state) => ({
            investments: state.investments.map((inv) =>
              inv.id === investmentId
                ? {
                    ...inv,
                    status: 'cancelled',
                  }
                : inv
            ),
          }));
        },
        
        createDistribution: (propertyId, type, amountPerToken, date) => {
          const newDistribution: Distribution = {
            id: `dist-${Date.now()}`,
            propertyId,
            type,
            amountPerToken,
            currency: 'KES',
            distributionDate: date,
            status: 'pending',
            notes: `Automatic ${type} distribution`,
          };
          
          set((state) => ({
            distributions: [...state.distributions, newDistribution],
            distributionsByProperty: {
              ...state.distributionsByProperty,
              [propertyId]: [
                ...(state.distributionsByProperty[propertyId] || []),
                newDistribution,
              ],
            },
          }));
        },
        
        markDistributionAsPaid: (distributionId) => {
          set((state) => ({
            distributions: state.distributions.map((dist) =>
              dist.id === distributionId
                ? {
                    ...dist,
                    status: 'paid',
                  }
                : dist
            ),
          }));
        },
        
        calculatePortfolioSummary: (userId) => {
          const investments = get().getUserInvestments(userId);
          const tokens = get().getUserTokens(userId);
          
          const totalInvested = investments.reduce(
            (sum, inv) => sum + inv.amountInvested,
            0,
          );
          const totalTokens = tokens.length;
          const propertiesOwned = new Set(investments.map((inv) => inv.propertyId)).size;
          
          // Calculate estimated value (assuming tokens appreciate)
          const estimatedValue = tokens.reduce(
            (sum, token) => sum + token.pricePerToken * 1.1, // 10% appreciation
            0,
          );
          
          const unrealizedGains = estimatedValue - totalInvested;
          const allTimeROI = totalInvested > 0 ? (unrealizedGains / totalInvested) * 100 : 0;
          
          return {
            totalInvested,
            totalTokens,
            propertiesOwned,
            estimatedValue,
            unrealizedGains,
            allTimeROI,
          };
        },
        
        updatePortfolio: () => {
          const userId = 'current-user'; // This would be replaced with actual user ID
          const portfolio = get().calculatePortfolioSummary(userId);
          set({ portfolio });
        },
        
        selectPropertyForInvestment: (propertyId) => {
          set({ selectedPropertyForInvestment: propertyId, selectedTokens: [] });
        },
        
        selectToken: (tokenId) => {
          set((state) => {
            const newSelected = [...state.selectedTokens, tokenId];
            return { selectedTokens: newSelected };
          });
        },
        
        deselectToken: (tokenId) => {
          set((state) => ({
            selectedTokens: state.selectedTokens.filter((id) => id !== tokenId),
          }));
        },
        
        clearSelectedTokens: () => set({ selectedTokens: [] }),
        
        startKYC: () => {
          set({ kycStatus: 'pending', kycData: null });
        },
        
        submitKYCData: async (data) => {
          get().setProcessing(true, 'Submitting KYC data...');
          
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          set({
            kycStatus: 'pending',
            kycData: data,
            isProcessing: false,
            processingMessage: null,
          });
        },
        
        verifyKYC: (verificationData) => {
          set({
            kycStatus: 'verified',
            kycData: { ...get().kycData, ...verificationData },
          });
        },
        
        rejectKYC: (reason) => {
          set({
            kycStatus: 'rejected',
            lastError: `KYC rejected: ${reason}`,
          });
        },
        
        createOrder: (userId, tokenId, propertyId, type, price, quantity) => {
          const newOrder: MarketOrder = {
            id: `order-${Date.now()}`,
            userId,
            tokenId,
            propertyId,
            type,
            pricePerToken: price,
            quantity,
            currency: 'KES',
            status: 'open',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          
          set((state) => ({
            marketOrders: [...state.marketOrders, newOrder],
          }));
          
          return newOrder;
        },
        
        cancelOrder: (orderId) => {
          set((state) => ({
            marketOrders: state.marketOrders.map((order) =>
              order.id === orderId
                ? {
                    ...order,
                    status: 'cancelled',
                  }
                : order
            ),
          }));
        },
        
        fillOrder: (orderId, buyerId) => {
          set((state) => ({
            marketOrders: state.marketOrders.map((order) =>
              order.id === orderId
                ? {
                    ...order,
                    status: 'filled',
                  }
                : order
            ),
          }));
          
          // Transfer token ownership
          const order = get().marketOrders.find((o) => o.id === orderId);
          if (order) {
            set((state) => ({
              tokens: state.tokens.map((token) =>
                token.id === order.tokenId
                  ? {
                      ...token,
                      ownerId: buyerId,
                      status: 'sold',
                      purchasedAt: new Date().toISOString(),
                    }
                  : token
              ),
            }));
          }
        },
        
        getTokensForProperty: (propertyId) => {
          return get().tokens.filter((t) => t.propertyId === propertyId);
        },
        
        getAvailableTokensForProperty: (propertyId) => {
          return get().tokens.filter(
            (t) => t.propertyId === propertyId && t.status === 'available',
          );
        },
        
        getUserTokens: (userId) => {
          return get().tokens.filter((t) => t.ownerId === userId && t.status === 'sold');
        },
        
        getUserInvestments: (userId) => {
          return get().investments.filter((i) => i.userId === userId);
        },
        
        getPropertyInvestors: (propertyId) => {
          return get().investments.filter((i) => i.propertyId === propertyId);
        },
        
        getTokenById: (tokenId) => {
          return get().tokens.find((t) => t.id === tokenId);
        },
        
        getInvestmentById: (investmentId) => {
          return get().investments.find((i) => i.id === investmentId);
        },
        
        getUserPortfolio: (userId) => {
          return get().calculatePortfolioSummary(userId);
        },
        
        setProcessing: (isProcessing, message = null) => {
          set({ isProcessing, processingMessage: message });
        },
        
        setError: (error) => {
          set({ lastError: error, isProcessing: false, processingMessage: null });
        },
        
        clearError: () => {
          set({ lastError: null });
        },
      }),
      {
        name: 'TokenizeStore',
        storage: localStorageAdapter,
        partialize: (state) => ({
          // Persist user-specific data
          investments: state.investments,
          investmentsByUser: state.investmentsByUser,
          kycStatus: state.kycStatus,
          kycData: state.kycData,
          // Note: tokens and distributions are not persisted as they come from backend
        }),
      },
    ),
    { name: 'TokenizeStore' },
  ),
);

// Selectors for better performance
export const useTokens = () => useTokenizeStore((state) => state.tokens);
export const useInvestments = () => useTokenizeStore((state) => state.investments);
export const useDistributions = () => useTokenizeStore((state) => state.distributions);
export const usePortfolio = () => useTokenizeStore((state) => state.portfolio);
export const useSelectedPropertyForInvestment = () => 
  useTokenizeStore((state) => state.selectedPropertyForInvestment);
export const useSelectedTokens = () => useTokenizeStore((state) => state.selectedTokens);
export const useKYCStatus = () => useTokenizeStore((state) => state.kycStatus);
export const useIsProcessing = () => useTokenizeStore((state) => state.isProcessing);
export const useProcessingMessage = () => useTokenizeStore((state) => state.processingMessage);
export const useLastError = () => useTokenizeStore((state) => state.lastError);
export const useMarketOrders = () => useTokenizeStore((state) => state.marketOrders);

// Compatibility exports for existing code
export type TokenizeStoreType = TokenizeState & TokenizeActions;
