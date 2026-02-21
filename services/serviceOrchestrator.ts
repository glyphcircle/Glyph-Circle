// services/serviceOrchestrator.ts
// ✅ Universal service flow controller - handles ALL services uniformly
// 🛡️ Bulletproof: Timeouts, retries, fallbacks, state recovery

import { dbService } from './db';
import { supabase } from './supabaseClient';
import { resolveService } from './serviceRegistry';
export interface ServiceConfig {
    serviceType: string;
    serviceName: string;
    price: number;
    requiresPayment: boolean;
}

export interface ServiceFlowOptions {
    serviceType: string;
    formInputs: Record<string, any>;
    onCacheFound?: (reading: any, transaction: any) => void;
    onPaymentRequired?: (config: ServiceConfig) => void;
    onGenerateReport?: () => Promise<any>;
    onSuccess?: (reading: any) => void;
    onError?: (error: Error) => void;
}

export interface ServiceFlowResult {
    success: boolean;
    cached: boolean;
    reading?: any;
    transaction?: any;
    error?: Error;
}

/**
 * 🛡️ TIMEOUT WRAPPER - Prevents hanging requests
 */
const withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallback: T,
    label: string
): Promise<T> => {
    const timeoutPromise = new Promise<T>((resolve) => {
        setTimeout(() => {
            console.warn(`⏱️ [ServiceOrchestrator] ${label} timed out after ${timeoutMs}ms`);
            resolve(fallback);
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
};

/**
 * 🔄 RETRY WRAPPER - Handles transient failures
 */
const withRetry = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    label: string
): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            if (attempt === maxRetries) {
                console.error(`❌ [ServiceOrchestrator] ${label} failed after ${maxRetries} attempts:`, err);
                throw err;
            }
            console.warn(`⚠️ [ServiceOrchestrator] ${label} attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    throw new Error(`${label} failed after ${maxRetries} retries`);
};

/**
 * 📊 STEP 1: Get Service Configuration (with fallback)
 */
export const getServiceConfig = async (serviceType: string): Promise<ServiceConfig> => {
    console.log(`🔍 [ServiceOrchestrator] Fetching config for: ${serviceType}`);

    try {
        const record = await withTimeout(
            resolveService(serviceType),   // ✅ handles UUID, slug, or name
            5000,
            null,
            'getServiceConfig'
        );

        if (record) {
            const config: ServiceConfig = {
                serviceType,
                serviceName: record.name,
                price: record.price || 0,
                requiresPayment: (record.price || 0) > 0,
            };
            console.log(`✅ [ServiceOrchestrator] Service config:`, config);
            return config;
        }

        throw new Error(`Service "${serviceType}" not found in registry`);

    } catch (err: any) {
        console.error(`❌ [ServiceOrchestrator] Config fetch failed, using free fallback:`, err);
        return {
            serviceType,
            serviceName: serviceType,
            price: 0,
            requiresPayment: false,
        };
    }
};

/**
 * 🔍 STEP 2: Check Yearly Cache (FIXED - was 24h, now full year)
 */
export const checkYearlyCache = async (
    serviceType: string,
    formInputs: Record<string, any>
): Promise<{ exists: boolean; reading?: any; transaction?: any }> => {
    console.log(`🔍 [ServiceOrchestrator] Checking yearly cache for: ${serviceType}`);

    try {
        const result = await withTimeout(
            withRetry(async () => {
                return await dbService.checkAlreadyPaidYearly(serviceType, formInputs);
            }, 2, 'checkYearlyCache'),
            5000,
            { exists: false },
            'checkYearlyCache'
        );

        if (result.exists) {
            console.log(`✅ [ServiceOrchestrator] Cache HIT! Found existing payment.`);
        } else {
            console.log(`ℹ️ [ServiceOrchestrator] Cache MISS. No existing payment found.`);
        }

        return result;

    } catch (err: any) {
        console.warn(`⚠️ [ServiceOrchestrator] Cache check failed, assuming no cache:`, err);
        return { exists: false };
    }
};

/**
 * 🎯 UNIVERSAL SERVICE FLOW - Works for ALL services
 */
export const executeServiceFlow = async (
    options: ServiceFlowOptions
): Promise<ServiceFlowResult> => {
    const { serviceType, formInputs, onCacheFound, onPaymentRequired, onGenerateReport, onSuccess, onError } = options;

    console.log(`🚀 [ServiceOrchestrator] Starting flow for: ${serviceType}`);

    try {
        // STEP 1: Get service configuration
        const config = await getServiceConfig(serviceType);

        // STEP 2: Check if service is free
        if (!config.requiresPayment) {
            console.log(`💚 [ServiceOrchestrator] Service is FREE, skipping payment`);

            if (onGenerateReport) {
                const reading = await onGenerateReport();
                if (onSuccess) onSuccess(reading);
                return { success: true, cached: false, reading };
            }

            return { success: true, cached: false };
        }

        // STEP 3: Check yearly cache for paid services
        const cache = await checkYearlyCache(serviceType, formInputs);

        if (cache.exists) {
            console.log(`✅ [ServiceOrchestrator] Using cached reading`);
            if (onCacheFound) onCacheFound(cache.reading, cache.transaction);
            return { success: true, cached: true, reading: cache.reading, transaction: cache.transaction };
        }

        // STEP 4: No cache, payment required
        console.log(`💳 [ServiceOrchestrator] Payment required, price: ₹${config.price}`);
        if (onPaymentRequired) onPaymentRequired(config);

        return { success: true, cached: false };

    } catch (err: any) {
        console.error(`❌ [ServiceOrchestrator] Flow failed:`, err);
        if (onError) onError(err);
        return { success: false, cached: false, error: err };
    }
};
