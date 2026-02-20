// src/components/reports/ReportRenderer.tsx
// Smart router that automatically selects Desktop or Mobile version

import React, { useState, useEffect } from 'react';
import DesktopReport from './DesktopReport';
import MobileReport from './MobileReport';

interface ReportRendererProps {
    reading: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    chartData?: any;
    category?: string;
}

const ReportRenderer: React.FC<ReportRendererProps> = (props) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            // ✅ Detect mobile/tablet devices
            const width = window.innerWidth;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(width < 1024 || isTouchDevice);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    // ✅ Render appropriate component based on device
    return isMobile ? <MobileReport {...props} /> : <DesktopReport {...props} />;
};

export default ReportRenderer;
