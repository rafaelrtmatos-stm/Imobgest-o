import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  ExternalLink, 
  Copy, 
  Check, 
  Compass, 
  Layers, 
  Globe, 
  Car, 
  Edit3,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { Empreendimento } from '../types';

interface GeographicLocationMapProps {
  empreendimento: Empreendimento;
  onUpdateCoordinates?: (empId: string, lat: number, lng: number, address?: string) => void;
}

export const GeographicLocationMap: React.FC<GeographicLocationMapProps> = ({
  empreendimento,
  onUpdateCoordinates,
}) => {
  const [copied, setCopied] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'normal'>('satellite');
  const [isEditingCoords, setIsEditingCoords] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const lat = empreendimento.latitude || -16.686891;
  const lng = empreendimento.longitude || -49.264794;
  
  const [editLat, setEditLat] = useState<number>(lat);
  const [editLng, setEditLng] = useState<number>(lng);
  const [editAddress, setEditAddress] = useState<string>(empreendimento.enderecoCompleto || empreendimento.localizacao);

  // Formatar Coordenadas para DMS (Graus, Minutos e Segundos)
  const formatDMS = (coord: number, isLat: boolean) => {
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const direction = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  const dmsLat = formatDMS(lat, true);
  const dmsLng = formatDMS(lng, false);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  const tileConfig = {
    normal: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', // Google Satellite Hybrid
      attribution: '&copy; Google Maps Satélite',
      maxZoom: 20,
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const currentConfig = tileConfig[mapStyle];
      const tileLayer = L.tileLayer(currentConfig.url, {
        attribution: currentConfig.attribution,
        maxZoom: currentConfig.maxZoom,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Custom Marker Pin
      const customIcon = L.divIcon({
        className: 'custom-single-marker',
        html: `
          <div class="relative group cursor-pointer transform -translate-x-1/2 -translate-y-full">
            <span class="absolute -top-1 -left-1 w-10 h-10 rounded-full bg-emerald-500/40 animate-ping"></span>
            <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-bold shadow-xl border bg-slate-900 text-white border-emerald-400 ring-2 ring-emerald-400/50">
              <div class="w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </div>
              <span class="text-xs font-heading font-extrabold whitespace-nowrap tracking-tight">${empreendimento.nome}</span>
            </div>
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-900 mx-auto -mt-[1px]"></div>
          </div>
        `,
        iconSize: [140, 42],
        iconAnchor: [70, 42],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      markerRef.current = marker;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng, empreendimento.nome]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const currentConfig = tileConfig[mapStyle];
    const newTileLayer = L.tileLayer(currentConfig.url, {
      attribution: currentConfig.attribution,
      maxZoom: currentConfig.maxZoom,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapStyle]);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCoords = () => {
    if (onUpdateCoordinates) {
      onUpdateCoordinates(empreendimento.id, editLat, editLng, editAddress);
    }
    setIsEditingCoords(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="geo-location-container">
      {/* CABEÇALHO GEOGRÁFICO */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white tracking-tight">
              Localização Geográfica & Georreferenciamento
            </h3>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              GPS ATIVO
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            {empreendimento.cidade} - {empreendimento.uf} • {empreendimento.bairro || 'Zona Urbana'} • CEP {empreendimento.cep || '74000-000'}
          </p>
        </div>

        {/* BOTÕES DE AÇÃO RÁPIDA & SELETOR DE MODO */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Satélite / Normal */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapStyle === 'satellite' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              🛰️ Satélite
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('normal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapStyle === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              🗺️ Normal
            </button>
          </div>

          <button
            onClick={handleCopyCoords}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer"
            title="Copiar Latitude e Longitude"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copiado!' : 'Copiar GPS'}</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Google Maps</span>
          </a>

          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Waze</span>
          </a>
        </div>
      </div>

      {/* GRID PRINCIPAL DO MAPA & DETALHES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-200">
        {/* MAPA INTERATIVO LEAFLET */}
        <div className="lg:col-span-8 relative bg-slate-900 min-h-[380px] lg:min-h-[460px] flex flex-col">
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px] lg:min-h-[460px] z-0" />

          {/* OVERLAY DE STATUS GPS NO CANTO SUPERIOR */}
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-slate-700/60 shadow-lg text-xs font-mono space-y-1 z-10">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-slate-200">{empreendimento.nome}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold">
              LAT {lat.toFixed(6)} | LNG {lng.toFixed(6)}
            </div>
            <div className="text-[10px] text-slate-400">
              {dmsLat} {dmsLng}
            </div>
          </div>

          {/* OVERLAY DE PONTOS DE REFERÊNCIA */}
          {empreendimento.pontosReferencia && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md text-xs text-slate-700 flex items-center space-x-2 z-10">
              <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-900">Referência:</span>
              <span className="text-slate-600 truncate">{empreendimento.pontosReferencia}</span>
            </div>
          )}
        </div>

        {/* PAINEL LATERAL DE INFORMAÇÕES DE ENDEREÇO & EDIÇÃO */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-slate-50 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Dados de Endereçamento</span>
              </h4>
              <button
                onClick={() => setIsEditingCoords(!isEditingCoords)}
                className="text-xs text-emerald-700 font-bold hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingCoords ? 'Cancelar' : 'Editar GPS'}</span>
              </button>
            </div>

            {/* FORMULÁRIO DE EDIÇÃO RÁPIDA DE COORDENADAS GPS */}
            {isEditingCoords ? (
              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <p className="text-xs font-bold text-slate-800">Editar Coordenadas Geográficas</p>
                <div>
                  <label className="text-[11px] font-mono text-slate-600 block mb-1">Latitude Decimal</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLat}
                    onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-600 block mb-1">Longitude Decimal</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLng}
                    onChange={(e) => setEditLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-600 block mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveCoords}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  Salvar Coordenadas Atualizadas
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-mono text-slate-500 block">Logradouro & Localização</span>
                  <p className="font-semibold text-slate-900">
                    {empreendimento.enderecoCompleto || empreendimento.localizacao}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-mono text-slate-500 block">Cidade / UF</span>
                    <p className="font-bold text-slate-900">{empreendimento.cidade} - {empreendimento.uf}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-mono text-slate-500 block">Bairro</span>
                    <p className="font-bold text-slate-900 truncate">{empreendimento.bairro || 'Setor Central'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-mono text-slate-500 block">Código Postal (CEP)</span>
                    <p className="font-mono font-bold text-slate-900">{empreendimento.cep || '74000-000'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-mono text-slate-500 block">Zona de Zoneamento</span>
                    <p className="font-semibold text-slate-900">{empreendimento.zona || 'Urbana'}</p>
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-800">Coordenadas Geográficas</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">WGS84</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    Latitude: <span className="text-emerald-700">{lat.toFixed(6)}</span>
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    Longitude: <span className="text-emerald-700">{lng.toFixed(6)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* INFRAESTRUTURA APROVADA */}
          {empreendimento.infraestrutura && empreendimento.infraestrutura.length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <span className="text-[11px] font-mono font-bold text-slate-700 block mb-2">
                Infraestrutura no Local:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {empreendimento.infraestrutura.slice(0, 5).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 mr-1" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
