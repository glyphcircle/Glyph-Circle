// ABTesting.tsx - FIXED: Repositioned to avoid overlap
// Changes:
// 1. bottom-4 → bottom-24 (safe zone away from FABs/buttons)
// 2. z-50 → z-20 (lower priority)
// 3. Added hover:opacity-100 toggle (already there)
// 4. pointer-events-none (already correct)

import React, { useState, useEffect } from 'react';
import { useAnalytics } from './Analytics';

type Variant = 'A' | 'B';

interface ExperimentConfig {
    id: string;
    variants: Variant[];
    weights: number[]; // [0.5, 0.5]
}

export const useABTest = (experimentId: string, defaultValue: any = 49) => {
    // useABTest hook UNCHANGED (logic perfect)
    const { track } = useAnalytics();
    const [variant, setVariant] = useState<Variant>('A');
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        const storageKey = `glyph_exp_${experimentId}`;
        let assigned = localStorage.getItem(storageKey) as Variant;

        if (!assigned) {
            assigned = Math.random() > 0.5 ? 'B' : 'A';
            localStorage.setItem(storageKey, assigned);
            track('Experiment Assigned', {
                experiment: experimentId,
                variant: assigned
            });
        }

        setVariant(assigned);

        if (experimentId === 'pricing_model_v1') {
            setValue(assigned === 'A' ? 49 : 29);
        }
    }, [experimentId, track]);

    return { variant, value };
};

// ABTestStatus - FIXED POSITIONING
export const ABTestStatus: React.FC = () => {
    return (
        // FIXED: bottom-24 ensures it stays above FABs/buttons, z-20 below main UI
        <div className="fixed bottom-24 left-4 z-20 bg-black/80 border border-gray-700 p-2 rounded text-[10px] text-gray-400 font-mono pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
            <div>TEST: Pricing V1</div>
            <div>VARIANT: {localStorage.getItem('glyph_exp_pricing_model_v1') || 'Unassigned'}</div>
        </div>
    );
}
