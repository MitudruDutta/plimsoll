// @ts-nocheck
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { DemoStartScreen } from '@/components/DemoStartScreen';
import { GlobalPort } from '@/utils/routeCalculator';

export const PortSelectionPage: React.FC = () => {
  const router = useRouter();

  const handleStart = (origin: GlobalPort, destination: GlobalPort) => {
    // Next.js App Router doesn't ship a `location.state` analogue, so we
    // stash the selected ports in sessionStorage and the DemoPage reads
    // them on mount. Falls back to MAJOR_PORTS defaults when absent.
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'plimsoll.demo.route',
          JSON.stringify({ origin, destination }),
        );
      } catch {
        // Storage may be unavailable in private mode — fall through.
      }
    }
    router.push('/demo');
  };

  return (
    <div className="h-screen w-screen bg-[#0a0e1a]">
        <DemoStartScreen onStart={handleStart} />
    </div>
  );
};


export default PortSelectionPage;
