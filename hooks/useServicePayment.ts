// hooks/useServicePayment.ts
// ✅ FIXED: Reusable hook for ALL service components
// 🎯 Handles free services, paid services, and cache properly

import { useState, useCallback } from 'react';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { executeServiceFlow, ServiceConfig } from '../services/serviceOrchestrator';

export interface UseServicePaymentOptions {
    serviceType: string;
    onReportGenerated?: (reading: any) => void;
    onCacheRestored?: (reading: any, transaction: any) => void;
}

export const useServicePayment = (options: UseServicePaymentOptions) => {
    const { serviceType, onReportGenerated, onCacheRestored } = options;

    const { openPayment } = usePayment();
    const { user } = useAuth();

    const [isCheckingCache, setIsCheckingCache] = useState(false);
    const [serviceConfig, setServiceConfig] = useState<ServiceConfig | null>(null);

    /**
     * 🎯 Main flow: Check cache → Show payment → Generate report
     */
    const initiateFlow = useCallback(async (
        formInputs: Record<string, any>,
        generateReport: () => Promise<any>
    ) => {
        setIsCheckingCache(true);

        const result = await executeServiceFlow({
            serviceType,
            formInputs,

            // Cache found callback
            onCacheFound: (reading, transaction) => {
                console.log('✅ [useServicePayment] Cache found, restoring...');
                setIsCheckingCache(false);
                if (onCacheRestored) onCacheRestored(reading, transaction);
            },

            // Payment required callback
            onPaymentRequired: (config) => {
                console.log('💳 [useServicePayment] Opening payment modal...');
                setIsCheckingCache(false);
                setServiceConfig(config);

                openPayment(async (paymentDetails?: any) => {
                    console.log('✅ [useServicePayment] Payment successful, generating report...');

                    // Generate report after payment
                    const reading = await generateReport();

                    // Save to database
                    try {
                        const savedReading = await dbService.saveReading({
                            user_id: user?.id,
                            type: serviceType,
                            title: config.serviceName,
                            content: reading.content || reading.reading || reading.textReading || JSON.stringify(reading),
                            meta_data: reading.meta_data || reading.engineData || reading.rawMetrics || {},
                            is_paid: true
                        });

                        const readingId = savedReading?.data?.id;

                        if (readingId) {
                            await dbService.recordTransaction({
                                user_id: user?.id,
                                service_type: serviceType,
                                service_title: config.serviceName,
                                amount: config.price,
                                currency: 'INR',
                                payment_method: paymentDetails?.method || 'manual',
                                payment_provider: paymentDetails?.provider || 'manual',
                                order_id: paymentDetails?.orderId || `ORD-${Date.now()}`,
                                transaction_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
                                reading_id: readingId,
                                status: 'success',
                                metadata: {
                                    ...formInputs,
                                    paymentTimestamp: new Date().toISOString()
                                }
                            });
                        }

                        if (onReportGenerated) onReportGenerated(reading);
                    } catch (err) {
                        console.error('❌ [useServicePayment] Save failed:', err);
                        // Still show report even if save fails
                        if (onReportGenerated) onReportGenerated(reading);
                    }
                }, config.serviceName, config.price);
            },

            // ✅ FIXED: Free service - just trigger callback immediately
            onGenerateReport: async () => {
                console.log('💚 [useServicePayment] Free service - showing report immediately');
                setIsCheckingCache(false);

                // ✅ FIX: Just trigger the success callback
                // The component already has the reading in state
                if (onReportGenerated) {
                    onReportGenerated({ _freeServiceTrigger: true });
                }

                return { success: true };
            },

            onError: (error) => {
                console.error('❌ [useServicePayment] Flow error:', error);
                setIsCheckingCache(false);
            }
        });

        setIsCheckingCache(false);
        return result;
    }, [serviceType, user, openPayment, onReportGenerated, onCacheRestored, serviceConfig]);

    return {
        initiateFlow,
        isCheckingCache,
        serviceConfig
    };
};
