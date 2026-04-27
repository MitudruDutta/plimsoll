// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ship } from '../utils/shipData';
import { X, Navigation, Fuel, Box, Anchor, AlertTriangle, Clock, MapPin } from 'lucide-react';

interface ShipDetailsCardProps {
  ship: Ship | null;
  onClose: () => void;
}

export function ShipDetailsCard({ ship, onClose }: ShipDetailsCardProps) {
  if (!ship) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        className="absolute top-24 left-32 z-50 w-80 bg-white/95 border border-[var(--line-strong)] rounded-xl shadow-[0_24px_56px_-12px_rgba(15,23,42,0.30)] backdrop-blur-md overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header - Draggable Area */}
        <div className="relative h-24 bg-gradient-to-r from-[rgba(37,99,235,0.10)] to-[rgba(37,99,235,0.03)] p-4 flex flex-col justify-end border-b border-[var(--line)] cursor-move group">
            {/* Type Icon Background */}
            <div className="absolute top-2 right-2 opacity-10">
                <Anchor className="w-16 h-16 text-[var(--accent-2)]" />
            </div>

            <button
                onClick={onClose}
                className="absolute top-2 right-2 p-1 rounded-md text-[var(--text-low)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)] transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.10em] border ${
                    ship.status === 'At Risk' ? 'bg-[rgba(220,38,38,0.10)] text-[#b91c1c] border-[rgba(220,38,38,0.30)]' :
                    ship.status === 'Diverting' ? 'bg-[rgba(217,119,6,0.10)] text-[#b45309] border-[rgba(217,119,6,0.30)]' :
                    'bg-[rgba(22,163,74,0.10)] text-[#15803d] border-[rgba(22,163,74,0.30)]'
                }`}>
                    {ship.status}
                </span>
                <span className="text-[10.5px] text-[var(--text-mid)] font-mono tracking-wider">{ship.type.toUpperCase()}</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-hi)] tracking-[-0.01em]">{ship.name}</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-1)] border border-[var(--line)] p-2 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Navigation className="w-3 h-3 text-[var(--accent-3)]" />
                        <span className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.08em]">Speed / Crs</span>
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-hi)]">{ship.speed} kn <span className="text-[var(--text-low)]">|</span> {Math.round(ship.heading)}°</div>
                </div>
                <div className="bg-[var(--bg-1)] border border-[var(--line)] p-2 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Fuel className="w-3 h-3 text-[var(--accent-3)]" />
                        <span className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.08em]">Fuel Lvl</span>
                    </div>
                     <div className="text-sm font-semibold text-[var(--text-hi)]">{ship.fuelLevel}%</div>
                </div>
            </div>

            {/* Position Display */}
            <div className="bg-[var(--bg-1)] border border-[var(--line)] p-2 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-[var(--accent-3)]" />
                    <span className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.08em]">Position</span>
                </div>
                <div className="text-sm font-semibold text-[var(--text-hi)] font-mono tracking-tight">
                    {Math.abs(ship.position[1]).toFixed(2)}°{ship.position[1] >= 0 ? 'N' : 'S'}
                    <span className="mx-2 text-[var(--text-low)]">|</span>
                    {Math.abs(ship.position[0]).toFixed(2)}°{ship.position[0] >= 0 ? 'E' : 'W'}
                </div>
            </div>

            {/* Route Info */}
            <div className="space-y-2">
                 <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-2)]" />
                        <div className="w-0.5 h-6 bg-[var(--line-strong)]" />
                        <div className="w-2 h-2 rounded-full border border-[#dc2626]" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <div className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.08em] mb-0.5">Origin</div>
                            <div className="text-sm text-[var(--text-hi)]">{ship.origin}</div>
                        </div>
                        <div>
                            <div className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.08em] mb-0.5">Destination</div>
                            <div className="text-sm text-[var(--text-hi)]">{ship.destination}</div>
                        </div>
                    </div>
                    <div className="text-right">
                         <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-2)] border border-[var(--line)] rounded-md mb-2">
                            <Clock className="w-3 h-3 text-[var(--text-mid)]" />
                            <span className="text-xs font-mono text-[var(--text-hi)]">ETA: {ship.eta}</span>
                         </div>
                         <div className="text-[10.5px] text-[#b91c1c] font-semibold flex items-center justify-end gap-1">
                            {ship.riskFactor !== 'Low' && <AlertTriangle className="w-3 h-3" />}
                            Risk: {ship.riskFactor}
                         </div>
                    </div>
                 </div>
            </div>

            {/* Cargo Manifest */}
             <div className="bg-[var(--bg-1)] border border-[var(--line)] p-3 rounded-lg flex items-center gap-3">
                <div className="p-2 bg-[rgba(37,99,235,0.10)] border border-[rgba(37,99,235,0.20)] rounded-lg">
                    <Box className="w-4 h-4 text-[var(--accent-3)]" />
                </div>
                <div>
                     <div className="text-[10.5px] text-[var(--text-mid)] uppercase tracking-[0.08em]">Cargo Manifest</div>
                     <div className="text-xs text-[var(--text-hi)] font-semibold">{ship.cargo}</div>
                </div>
             </div>

             {/* Actions */}
             <div className="grid grid-cols-2 gap-2 pt-2">

                <button className="px-3 py-2 bg-[rgba(37,99,235,0.10)] border border-[rgba(37,99,235,0.30)] hover:bg-[rgba(37,99,235,0.18)] text-xs text-[var(--accent-3)] font-semibold transition-colors rounded-lg">
                    Contact Channel
                </button>
             </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
