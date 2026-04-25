import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat, transformExtent } from 'ol/proj';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/api/client';
import { MapPin, Loader2, Info, X, Droplets, Battery, Thermometer } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  mapVisualUrl?: string | null;
  mapBounds?: number[][] | null;
}

interface SubBlock {
  id: string;
  name: string;
  polygonGeom: string; // Stored as GeoJSON string in DB
}

export function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const [selectedSubBlock, setSelectedSubBlock] = useState<{ id: string; name: string } | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [fieldHistory, setFieldHistory] = useState<any[]>([]);
  const [loadingFieldHistory, setLoadingFieldHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'water' | 'temp' | 'humidity'>('water');

  const vectorSource = useRef(new VectorSource());
  const imageLayer = useRef(new ImageLayer());
  const osmLayer = useRef(new TileLayer({ source: new OSM() }));

  // Fetch Field-wide history
  useEffect(() => {
    if (!selectedFieldId) return;
    const fetchFieldHistory = async () => {
      try {
        setLoadingFieldHistory(true);
        const res = await apiClient.get(`/telemetry/fields/${selectedFieldId}/history`);
        setFieldHistory(res.data.data);
      } catch (err) {
        console.error("Failed to fetch field telemetry history", err);
      } finally {
        setLoadingFieldHistory(false);
      }
    };
    fetchFieldHistory();
  }, [selectedFieldId]);

  // Listen to Map Clicks
  useEffect(() => {
    if (!map) return;
    const clickHandler = (evt: any) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat);
      if (feature) {
        setSelectedSubBlock({
          id: feature.get('id'),
          name: feature.get('name')
        });
      }
    };
    map.on('click', clickHandler);
    return () => map.un('click', clickHandler);
  }, [map]);

  // Fetch Telemetry History on Selection
  useEffect(() => {
    if (!selectedSubBlock) return;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await apiClient.get(`/telemetry/sub-blocks/${selectedSubBlock.id}/history`);
        setTelemetryHistory(res.data.data);
      } catch (err) {
        console.error("Failed to fetch telemetry history", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedSubBlock]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        osmLayer.current,
        imageLayer.current,
        new VectorLayer({
          source: vectorSource.current,
          style: (feature) => {
            return new Style({
              stroke: new Stroke({
                color: '#16a34a',
                width: 2,
              }),
              fill: new Fill({
                color: 'rgba(34, 197, 94, 0.2)',
              }),
              text: new Text({
                text: feature.get('name'),
                font: 'bold 12px Inter, sans-serif',
                fill: new Fill({ color: '#166534' }),
                stroke: new Stroke({ color: '#fff', width: 2 }),
              }),
            });
          },
        }),
      ],
      view: new View({
        center: fromLonLat([106.8456, -6.2088]), // Default center (Jakarta area approx)
        zoom: 12,
      }),
    });

    setMap(initialMap);

    return () => initialMap.setTarget(undefined);
  }, []);

  // 2. Fetch Fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await apiClient.get('/fields');
        const data = response.data.data;
        setFields(data);
        if (data.length > 0) {
          setSelectedFieldId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch fields', err);
      }
    };
    fetchFields();
  }, []);

  // 3. Fetch & Render Sub-blocks for Selected Field
  useEffect(() => {
    if (!selectedFieldId || !map) return;

    const fetchSubBlocks = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/fields/${selectedFieldId}/sub-blocks`);
        const subBlocks: SubBlock[] = response.data.data;

        vectorSource.current.clear();

        const geojsonFormat = new GeoJSON();
        const features: any[] = [];

        subBlocks.forEach((sb) => {
          if (!sb.polygonGeom) return;
          try {
            // Check if it's already an object or a string
            const geom = typeof sb.polygonGeom === 'string' 
              ? JSON.parse(sb.polygonGeom) 
              : sb.polygonGeom;
            
            if (!geom || !geom.coordinates || geom.coordinates.length === 0) return;
            
            const feature = geojsonFormat.readFeature(
              {
                type: 'Feature',
                geometry: geom,
                properties: { id: sb.id, name: sb.name },
              },
              {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
              }
            );
            features.push(feature);
          } catch (e) {
            console.error(`Invalid geometry for sub-block ${sb.name}`, e);
          }
        });

        // Render Image Overlay if available
        const field = fields.find(f => f.id === selectedFieldId);
        if (field?.mapVisualUrl) {
          try {
            osmLayer.current.setVisible(false); // Sembunyikan base map jika ada drone imagery

            const bounds = field.mapBounds || [[ -6.2100, 106.8100], [-6.2110, 106.8110]];
            const extent = transformExtent(
              [bounds[0][1], bounds[1][0], bounds[1][1], bounds[0][0]],
              'EPSG:4326',
              'EPSG:3857'
            );
            
            imageLayer.current.setSource(new ImageStatic({
              url: field.mapVisualUrl,
              imageExtent: extent
            }));
            
            // Unconditionally fit to image bounds
            map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
          } catch (e) {
            console.error("Failed to render image overlay", e);
          }
        } else {
          osmLayer.current.setVisible(true); // Tampilkan base map
          imageLayer.current.setSource(null);
        }

        if (features.length > 0) {
          vectorSource.current.addFeatures(features);
          
          // Fit view to sub-blocks
          const extent = vectorSource.current.getExtent();
          if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
            map.getView().fit(extent, {
              padding: [50, 50, 50, 50],
              duration: 1000,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch sub-blocks', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubBlocks();
  }, [selectedFieldId, map]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] gap-6 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Peta Monitoring 2D</h2>
          <p className="text-muted-foreground mt-1">
            Visualisasi spasial petak sawah dan status irigasi.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Pilih Lokasi:</span>
          <select 
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-semibold cursor-pointer outline-none min-w-[150px]"
          >
            {fields.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative h-[650px] rounded-xl border bg-card shadow-lg overflow-hidden group">
        <div 
          ref={mapRef} 
          className="w-full h-full"
        />

        {/* Slide-Out Analytics Drawer */}
        {selectedSubBlock && (
          <div className="absolute top-0 right-0 h-full w-96 bg-background/95 backdrop-blur-md border-l shadow-2xl z-30 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedSubBlock.name}</h3>
                <p className="text-xs text-muted-foreground">Insight historis data telemetri</p>
              </div>
              <button 
                onClick={() => setSelectedSubBlock(null)}
                className="p-1.5 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <span className="text-xs">Memuat riwayat metrik...</span>
                </div>
              ) : telemetryHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
                  <p>Belum ada data rekaman IoT</p>
                  <p className="text-[10px] opacity-75">Gunakan script generator untuk menyuntik data</p>
                </div>
              ) : (
                <>
                  {/* Grafik Tinggi Air (SVG) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <Droplets className="h-4 w-4" />
                        <span>Ketinggian Air (cm)</span>
                      </div>
                      <span className="text-foreground">Ambang: ±20cm</span>
                    </div>

                    <div className="h-40 w-full bg-slate-900/5 dark:bg-slate-50/5 border rounded-lg p-2 flex items-center justify-center relative">
                      {telemetryHistory.length > 1 ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 320 120" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Zero Line (Garis Tengah) */}
                          <line x1="10" y1="60" x2="310" y2="60" stroke="rgba(148,163,184,0.3)" strokeDasharray="4" strokeWidth="1" />
                          
                          {/* Poligon Gradien */}
                          <polygon 
                            points={`10,110 ${telemetryHistory.map((d, i) => {
                              const x = 10 + (i / (telemetryHistory.length - 1)) * 300;
                              const val = parseFloat(d.waterLevelCm || 0);
                              const y = 60 - (val / 20) * 50; // Map range -20 ke +20 ke sumbu Y
                              return `${x},${Math.max(10, Math.min(110, y))}`;
                            }).join(' ')} 310,110`}
                            fill="url(#waterGrad)"
                          />
                          {/* Garis Utama */}
                          <polyline 
                            points={telemetryHistory.map((d, i) => {
                              const x = 10 + (i / (telemetryHistory.length - 1)) * 300;
                              const val = parseFloat(d.waterLevelCm || 0);
                              const y = 60 - (val / 20) * 50;
                              return `${x},${Math.max(10, Math.min(110, y))}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <span className="text-2xs text-muted-foreground">Butuh data berurutan untuk plot tren</span>
                      )}
                    </div>
                  </div>

                  {/* Ringkasan Parameter */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 border rounded-lg flex flex-col gap-1 bg-card/50">
                      <div className="flex items-center gap-1.5 text-orange-500">
                        <Thermometer className="h-4 w-4" />
                        <span>Suhu Rata-rata</span>
                      </div>
                      <span className="font-bold text-sm">
                        {telemetryHistory.reduce((acc, cur) => acc + parseFloat(cur.temperatureC || 0), 0) / telemetryHistory.length | 0} °C
                      </span>
                    </div>

                    <div className="p-3 border rounded-lg flex flex-col gap-1 bg-card/50">
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <Battery className="h-4 w-4" />
                        <span>Daya Baterai</span>
                      </div>
                      <span className="font-bold text-sm">
                        {parseFloat(telemetryHistory[telemetryHistory.length - 1]?.batteryPct || 100).toFixed(0)} %
                      </span>
                    </div>
                  </div>

                  {/* Raw Data List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">Log Pembacaan Terakhir</span>
                    <div className="border rounded-lg overflow-hidden text-[11px] divide-y max-h-48 overflow-y-auto bg-card/30">
                      {telemetryHistory.slice().reverse().map((rec, idx) => (
                        <div key={rec.id || idx} className="p-2 flex justify-between items-center hover:bg-muted/40 transition-colors">
                          <span className="text-muted-foreground font-mono">
                            {new Date(rec.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`font-semibold ${parseFloat(rec.waterLevelCm) < -10 ? 'text-destructive' : parseFloat(rec.waterLevelCm) > 10 ? 'text-blue-500' : 'text-foreground'}`}>
                            {parseFloat(rec.waterLevelCm).toFixed(1)} cm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Memuat data spasial...</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
           <Card className="shadow-md bg-background/90 backdrop-blur">
             <CardContent className="p-3 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-green-600 bg-green-500/20 rounded-sm"></div>
                  <span>Petak Sawah (Sub-block)</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm border border-white"></div>
                   <span>Device / Sensor (AWD)</span>
                </div>
             </CardContent>
           </Card>
        </div>

        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
          <Card className="bg-background/90 backdrop-blur border-primary/20 shadow-xl max-w-xs transition-opacity duration-300 opacity-80 group-hover:opacity-100">
            <CardContent className="p-3 flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Petunjuk</p>
                <p className="text-xs leading-relaxed">
                  Gunakan roda mouse untuk zoom. Klik pada petak untuk melihat detail telemetri.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Persistent Field Analytics Chart */}
      <Card className="shadow-lg border bg-card/60 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Histori Data Input IoT</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rangkuman log telemetri terintegrasi lintas petak sawah (24 Jam terakhir).
              </p>
            </div>
            {fieldHistory.length > 0 && (
              <Badge variant="outline" className="text-2xs bg-primary/5 text-primary border-primary/20">
                Data Terakhir: {new Date(fieldHistory[fieldHistory.length - 1].event_timestamp).toLocaleString()}
              </Badge>
            )}
          </div>

          {/* Tab Selector */}
          <div className="flex border-b text-sm gap-4 pb-0 mt-4 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('water')}
              className={`pb-2 px-1 font-semibold transition-colors border-b-2 text-xs md:text-sm whitespace-nowrap ${activeTab === 'water' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Tinggi Air (cm)
            </button>
            <button 
              onClick={() => setActiveTab('temp')}
              className={`pb-2 px-1 font-semibold transition-colors border-b-2 text-xs md:text-sm whitespace-nowrap ${activeTab === 'temp' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Suhu Udara (°C)
            </button>
            <button 
              onClick={() => setActiveTab('humidity')}
              className={`pb-2 px-1 font-semibold transition-colors border-b-2 text-xs md:text-sm whitespace-nowrap ${activeTab === 'humidity' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Kelembapan (%)
            </button>
          </div>

          {loadingFieldHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <span className="text-sm font-medium">Menyusun kronologi data...</span>
            </div>
          ) : fieldHistory.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-1">
              <Droplets className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold">Data Telemetri Kosong</p>
              <p className="text-xs opacity-75">Sistem belum menerima pancaran pembacaan dari lapangan.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Plot SVG */}
              <div className="h-64 w-full bg-slate-950/5 dark:bg-slate-50/5 border rounded-xl p-4 flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="30" y1="40" x2="580" y2="40" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
                  <line x1="30" y1="100" x2="580" y2="100" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
                  <line x1="30" y1="160" x2="580" y2="160" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />

                  {/* Dynamic Axis Labels */}
                  {activeTab === 'water' && (
                    <>
                      <text x="5" y="45" className="text-[10px] fill-muted-foreground font-semibold font-mono">+15</text>
                      <text x="5" y="105" className="text-[10px] fill-muted-foreground font-semibold font-mono">0</text>
                      <text x="5" y="165" className="text-[10px] fill-muted-foreground font-semibold font-mono">-15</text>
                    </>
                  )}
                  {activeTab === 'temp' && (
                    <>
                      <text x="5" y="45" className="text-[10px] fill-muted-foreground font-semibold font-mono">35°</text>
                      <text x="5" y="105" className="text-[10px] fill-muted-foreground font-semibold font-mono">25°</text>
                      <text x="5" y="165" className="text-[10px] fill-muted-foreground font-semibold font-mono">15°</text>
                    </>
                  )}
                  {activeTab === 'humidity' && (
                    <>
                      <text x="5" y="45" className="text-[10px] fill-muted-foreground font-semibold font-mono">100%</text>
                      <text x="5" y="105" className="text-[10px] fill-muted-foreground font-semibold font-mono">70%</text>
                      <text x="5" y="165" className="text-[10px] fill-muted-foreground font-semibold font-mono">40%</text>
                    </>
                  )}

                  {/* Group Data By Sub-block */}
                  {Array.from(new Set(fieldHistory.map(d => d.sub_block_name))).map((sbName: any, idx) => {
                     const sbData = fieldHistory.filter(d => d.sub_block_name === sbName);
                     if (sbData.length < 2) return null;

                     const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
                     const color = colors[idx % colors.length];

                     const points = sbData.map((d: any, i: number) => {
                       const x = 30 + (i / (sbData.length - 1)) * 550;
                       let val = 0;
                       let y = 100;

                       if (activeTab === 'water') {
                         val = parseFloat(d.water_level_cm || 0);
                         y = 100 - (val / 15) * 60; // range -15 ke +15
                       } else if (activeTab === 'temp') {
                         val = parseFloat(d.temperature_c || 25);
                         y = 100 - ((val - 25) / 10) * 60; // range 15 ke 35
                       } else if (activeTab === 'humidity') {
                         val = parseFloat(d.humidity_pct || 70);
                         y = 100 - ((val - 70) / 30) * 60; // range 40 ke 100
                       }

                       return `${x},${Math.max(20, Math.min(180, y))}`;
                     }).join(' ');

                     return (
                        <g key={sbName}>
                          <polyline 
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                        </g>
                     );
                  })}
                </svg>
              </div>

              {/* Legend & Summary Cards */}
              <div className="flex flex-wrap gap-4 items-center border-t pt-4">
                <span className="text-xs font-bold text-muted-foreground">Legenda Petak:</span>
                {Array.from(new Set(fieldHistory.map(d => d.sub_block_name))).map((sbName: any, idx) => {
                   const colors = ['bg-blue-600', 'bg-green-600', 'bg-amber-600', 'bg-pink-600'];
                   const colorClass = colors[idx % colors.length];
                   return (
                     <div key={sbName} className="flex items-center gap-2 text-xs font-semibold">
                       <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                       <span>{sbName}</span>
                     </div>
                   );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
