import { supabase } from './supabaseClient';

export interface ShubhMuhuratInput {
    eventName: string;
    eventType: string;
    location?: string;
    preferredDate?: string;
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
    additionalNotes?: string;
}

export interface ShubhMuhuratReport {
    id: string;
    reportTitle: string;
    auspiciousDates: any[];
    inauspiciousPeriods: any[];
    recommendedMuhurat: any;
    planetaryPositions: any;
    nakshatraInfo: any;
    tithiInfo: any;
    yogaKarana: string;
    panchangDetails: any;
    remedies: string[];
    doAndDonts: string[];
    luckyColors: string[];
    luckyNumbers: number[];
    fullAnalysis: string;
}

/**
 * Create initial Shubh Muhurat reading (before payment)
 */
export const createShubhMuhuratReading = async (
    input: ShubhMuhuratInput,
    paymentAmount: number
): Promise<{ id: string; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { id: '', error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('shubh_muhurat_readings')
            .insert({
                user_id: user.id,
                event_name: input.eventName,
                event_type: input.eventType,
                location: input.location,
                preferred_date: input.preferredDate,
                preferred_time_start: input.preferredTimeStart,
                preferred_time_end: input.preferredTimeEnd,
                additional_notes: input.additionalNotes,
                payment_amount: paymentAmount,
                payment_currency: 'INR',
                payment_status: 'pending',
                is_paid: false
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error creating muhurat reading:', error);
            return { id: '', error: error.message };
        }

        console.log('✅ Shubh Muhurat reading created:', data.id);
        return { id: data.id };

    } catch (err: any) {
        console.error('Error in createShubhMuhuratReading:', err);
        return { id: '', error: err.message };
    }
};

/**
 * Update reading after payment confirmation
 */
export const updateMuhuratPaymentStatus = async (
    readingId: string,
    paymentDetails: any
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('shubh_muhurat_readings')
            .update({
                is_paid: true,
                payment_status: 'completed',
                generated_at: new Date().toISOString()
            })
            .eq('id', readingId);

        if (error) {
            console.error('Error updating payment status:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Payment status updated for reading:', readingId);
        return { success: true };

    } catch (err: any) {
        console.error('Error in updateMuhuratPaymentStatus:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Generate and store the actual muhurat report
 */
export const generateMuhuratReport = async (
    readingId: string,
    reportData: Partial<ShubhMuhuratReport>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('shubh_muhurat_readings')
            .update({
                report_title: reportData.reportTitle,
                auspicious_dates: reportData.auspiciousDates,
                inauspicious_periods: reportData.inauspiciousPeriods,
                recommended_muhurat: reportData.recommendedMuhurat,
                planetary_positions: reportData.planetaryPositions,
                nakshatra_info: reportData.nakshatraInfo,
                tithi_info: reportData.tithiInfo,
                yoga_karana: reportData.yogaKarana,
                panchang_details: reportData.panchangDetails,
                remedies: reportData.remedies,
                do_and_donts: reportData.doAndDonts,
                lucky_colors: reportData.luckyColors,
                lucky_numbers: reportData.luckyNumbers,
                full_analysis: reportData.fullAnalysis,
                generated_at: new Date().toISOString()
            })
            .eq('id', readingId);

        if (error) {
            console.error('Error saving report:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Muhurat report generated and saved:', readingId);
        return { success: true };

    } catch (err: any) {
        console.error('Error in generateMuhuratReport:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Fetch user's muhurat reading by ID
 */
export const getMuhuratReading = async (readingId: string) => {
    try {
        const { data, error } = await supabase
            .from('shubh_muhurat_readings')
            .select('*')
            .eq('id', readingId)
            .single();

        if (error) {
            console.error('Error fetching muhurat reading:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };

    } catch (err: any) {
        console.error('Error in getMuhuratReading:', err);
        return { data: null, error: err.message };
    }
};

/**
 * Fetch user's muhurat reading history
 */
export const getUserMuhuratHistory = async () => {
    try {
        const { data, error } = await supabase
            .from('v_user_muhurat_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching muhurat history:', error);
            return { data: [], error: error.message };
        }

        return { data, error: null };

    } catch (err: any) {
        console.error('Error in getUserMuhuratHistory:', err);
        return { data: [], error: err.message };
    }
};
