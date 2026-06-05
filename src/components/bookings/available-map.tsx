'use client';

import React, { useMemo } from 'react';
import { ShieldAlert, CheckCircle, Info } from 'lucide-react';

interface ZoneData {
  id: string;
  name: string;
  vietnameseName: string;
  description: string;
  // Percentage coordinates on the map image
  x: number; // Left %
  y: number; // Top %
  width: number;
  height: number;
  // SVG points for highlighting area
  points: string;
}

const ZONES: ZoneData[] = [
  {
    id: 'O',
    name: 'Greenbay Villas',
    vietnameseName: 'Khu Biệt Thự Greenbay',
    description: 'Các căn biệt thự màu xám phía trên.',
    x: 45,
    y: 15,
    width: 25,
    height: 18,
    points: '38,10 65,10 70,30 40,30'
  },
  {
    id: 'Q',
    name: 'Tropical Villas',
    vietnameseName: 'Biệt Thự Tropical',
    description: 'Các căn màu cam sát Bể bơi và Nhà hàng.',
    x: 68,
    y: 45,
    width: 20,
    height: 18,
    points: '60,35 88,35 85,60 55,60'
  },
  {
    id: 'R',
    name: 'Secret Garden',
    vietnameseName: 'Bungalow Secret Garden',
    description: 'Các căn màu vàng bao quanh Zen Spa.',
    x: 18,
    y: 38,
    width: 22,
    height: 20,
    points: '10,30 35,30 32,55 8,55'
  },
  {
    id: 'K',
    name: 'Muong Village',
    vietnameseName: 'Làng Mường Cúc Phương',
    description: 'Khu nhà sàn gỗ Bungalow truyền thống.',
    x: 42,
    y: 70,
    width: 28,
    height: 18,
    points: '30,62 70,62 65,85 25,85'
  }
];

interface AvailableMapProps {
  rooms: any[];
  selectedZone: string | null;
  onSelectZone: (zone: string | null) => void;
}

export default function AvailableMap({ rooms, selectedZone, onSelectZone }: AvailableMapProps) {
  // Compute availability statistics per zone
  const zoneStats = useMemo(() => {
    const stats: Record<string, { total: number; vacant: number }> = {
      Q: { total: 0, vacant: 0 },
      O: { total: 0, vacant: 0 },
      R: { total: 0, vacant: 0 },
      K: { total: 0, vacant: 0 },
    };

    rooms.forEach((r) => {
      if (stats[r.zone]) {
        stats[r.zone].total += 1;
        if (r.isFullyAvailable) {
          stats[r.zone].vacant += 1;
        }
      }
    });

    return stats;
  }, [rooms]);

  return (
    <div className="glass-card overflow-hidden border border-slate-800/80 shadow-2xl relative flex flex-col h-full bg-slate-950/60 backdrop-blur-md">
      {/* Header Info */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-outfit font-bold text-lg text-slate-100 flex items-center gap-2">
            <span>Bản Đồ Resort Tương Tác</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
              Trực Quan
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Chọn một phân khu trên bản đồ để lọc phòng trống.
          </p>
        </div>
        <div className="flex gap-3 text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-slate-300 font-medium">Trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-slate-300 font-medium">Cận</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="text-slate-300 font-medium">Kín</span>
          </div>
        </div>
      </div>

      {/* Map Content Area */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 min-h-[350px] lg:min-h-[450px]">
        {/* Map Image */}
        <div className="relative w-full max-w-[800px] aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 shadow-inner group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/resort_map.jpg"
            alt="Sơ đồ resort"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
          
          {/* SVG Overlay for drawing areas */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none select-none z-10"
            preserveAspectRatio="none"
          >
            {ZONES.map((zone) => {
              const stats = zoneStats[zone.id] || { total: 0, vacant: 0 };
              const isSelected = selectedZone === zone.id;
              
              let color = 'stroke-emerald-500 fill-emerald-500/10';
              if (stats.total > 0) {
                if (stats.vacant === 0) {
                  color = 'stroke-rose-500 fill-rose-500/10';
                } else if (stats.vacant < stats.total) {
                  color = 'stroke-amber-500 fill-amber-500/10';
                }
              }

              return (
                <polygon
                  key={zone.id}
                  points={zone.points}
                  className={`transition-all duration-300 ${color} ${
                    isSelected
                      ? 'stroke-[2px] fill-opacity-25'
                      : 'stroke-[0.5px] group-hover:stroke-[1px]'
                  }`}
                />
              );
            })}
          </svg>

          {/* Interactive Absolute Hotspots (Pins) */}
          {ZONES.map((zone) => {
            const stats = zoneStats[zone.id] || { total: 0, vacant: 0 };
            const isSelected = selectedZone === zone.id;
            
            // Color states
            let pinColor = 'bg-emerald-500 text-emerald-100 ring-emerald-500/30';
            let pulseColor = 'bg-emerald-400';
            let borderBorder = 'border-emerald-500/30';
            
            if (stats.total > 0) {
              if (stats.vacant === 0) {
                pinColor = 'bg-rose-600 text-rose-100 ring-rose-500/30';
                pulseColor = 'bg-rose-500';
                borderBorder = 'border-rose-500/30';
              } else if (stats.vacant < stats.total) {
                pinColor = 'bg-amber-500 text-amber-950 ring-amber-500/30';
                pulseColor = 'bg-amber-400';
                borderBorder = 'border-amber-500/30';
              }
            }

            return (
              <button
                key={zone.id}
                onClick={() => onSelectZone(isSelected ? null : zone.id)}
                style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group/pin focus:outline-none transition-all duration-300 ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                {/* Glowing Outer Ring for Available status */}
                {stats.vacant > 0 && (
                  <span className="absolute inline-flex h-8 w-8 rounded-full animate-ping opacity-60 pointer-events-none -mt-4">
                    <span className={`h-full w-full rounded-full ${pulseColor} opacity-75`}></span>
                  </span>
                )}

                {/* Pin Badge */}
                <div
                  className={`px-3 py-1.5 rounded-full font-outfit font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all duration-300 ring-4 ${pinColor} ${
                    isSelected ? 'ring-slate-100' : 'ring-opacity-0 group-pin-hover/pin:ring-opacity-50'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900/20 flex items-center justify-center text-[10px]">
                    {zone.id}
                  </span>
                  <span>{zone.name.split(' ')[0]}</span>
                  <span className="font-semibold opacity-90 text-[10px] bg-black/15 px-1.5 py-0.5 rounded-md">
                    {stats.vacant}/{stats.total}
                  </span>
                </div>

                {/* Tooltip on Hover */}
                <div className={`absolute bottom-full mb-2.5 w-52 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border ${borderBorder} shadow-2xl text-left pointer-events-none opacity-0 translate-y-1 group-hover/pin:opacity-100 group-hover/pin:translate-y-0 transition-all duration-300 z-30`}>
                  <p className="text-xs font-bold text-slate-100">{zone.vietnameseName}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{zone.description}</p>
                  <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Trạng thái trống:</span>
                    <span className={`font-bold ${stats.vacant > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stats.vacant === stats.total ? 'Trống hoàn toàn' : stats.vacant === 0 ? 'Kín phòng' : 'Còn phòng'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Zone Footer Information */}
      <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-300">
        {selectedZone ? (
          <>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Đang lọc theo phân khu:{' '}
                <strong className="text-slate-100">
                  {ZONES.find((z) => z.id === selectedZone)?.vietnameseName}
                </strong>
              </span>
            </div>
            <button
              onClick={() => onSelectZone(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
            >
              Hủy bộ lọc khu
            </button>
          </>
        ) : (
          <span className="text-slate-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-slate-500" />
            <span>Hiển thị tất cả phòng resort. Hãy chọn một phân khu trên bản đồ để thu hẹp.</span>
          </span>
        )}
      </div>
    </div>
  );
}
