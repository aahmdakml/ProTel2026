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
import { apiClient } from '@/api/client';
import { MapPin, Loader2, Info } from 'lucide-react';

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

  const vectorSource = useRef(new VectorSource());
  const imageLayer = useRef(new ImageLayer());

  // 1. Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
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
        if (field?.mapVisualUrl && field?.mapBounds) {
          try {
            const extent = transformExtent(
              [field.mapBounds[0][1], field.mapBounds[1][0], field.mapBounds[1][1], field.mapBounds[0][0]],
              'EPSG:4326',
              'EPSG:3857'
            );
            
            imageLayer.current.setSource(new ImageStatic({
              url: field.mapVisualUrl,
              imageExtent: extent
            }));
            
            // If no features, fit to image
            if (features.length === 0) {
               map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
            }
          } catch (e) {
            console.error("Failed to render image overlay", e);
          }
        } else {
          imageLayer.current.setSource(null);
        }

        if (features.length > 0) {
          vectorSource.current.addFeatures(features);
          
          // Fit view to sub-blocks
          const extent = vectorSource.current.getExtent();
          if (extent) {
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
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-in fade-in">
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

      <div className="relative flex-1 rounded-xl border bg-card shadow-lg overflow-hidden group">
        <div 
          ref={mapRef} 
          className="w-full h-full"
        />
        
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
    </div>
  );
}
