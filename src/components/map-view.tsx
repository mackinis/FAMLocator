'use client';

import { GoogleMap, useJsApiLoader, InfoWindowF, OverlayView } from '@react-google-maps/api';
import type { FamilyMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Crosshair } from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
];

type MapViewProps = {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember) => void;
  currentUser: FamilyMember | null;
  isSidebarOpen: boolean;
};

// This is the recommended way to stop propagation of map events
// https://developers.google.com/maps/documentation/javascript/examples/event-dom-propagation
const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
};

const getPixelPositionOffset = (width: number, height: number) => {
    return { x: -(width / 2), y: -(height / 2) };
}

export default function MapView({ members, selectedMember, onSelectMember, currentUser, isSidebarOpen }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const mapOptions = useMemo(() => {
    const currentHour = new Date().getHours();
    const isNightTime = currentHour < 6 || currentHour >= 18;

    return {
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: 'greedy' as const,
        styles: isNightTime ? darkMapStyle : [], // Use dark styles at night, default (light) during day
    }
  }, []);

  const center = useMemo(() => {
    return selectedMember
      ? { lat: selectedMember.location.lat, lng: selectedMember.location.lng }
      : (members.length > 0 ? { lat: members[0].location.lat, lng: members[0].location.lng } : { lat: 34.0522, lng: -118.2437 });
  }, [selectedMember, members]);

  useEffect(() => {
    if (mapRef.current && selectedMember) {
      mapRef.current.panTo({ lat: selectedMember.location.lat, lng: selectedMember.location.lng });
    }
  }, [selectedMember]);
  
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        google.maps.event.trigger(mapRef.current, 'resize');
        if (selectedMember) {
            mapRef.current?.panTo({ lat: selectedMember.location.lat, lng: selectedMember.location.lng });
        }
      }, 250);
    }
  }, [isSidebarOpen, selectedMember]);

  const handleCenterOnMe = () => {
    if (mapRef.current && currentUser) {
      mapRef.current.panTo({ lat: currentUser.location.lat, lng: currentUser.location.lng });
      mapRef.current.setZoom(15);
      onSelectMember(currentUser);
    }
  };

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };
  
  const handleMarkerClick = (member: FamilyMember) => {
    onSelectMember(member);
  }

  if (loadError) {
    return <div>Error al cargar el mapa. Asegúrate de que la clave de API sea correcta.</div>;
  }

  return isLoaded ? (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {members.map((member) => (
            <OverlayView
                key={member.id}
                position={{ lat: member.location.lat, lng: member.location.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={getPixelPositionOffset}
            >
                <div
                    className="flex flex-col items-center cursor-pointer"
                    onMouseDown={stopPropagation}
                    onMouseUp={stopPropagation}
                    onClick={() => handleMarkerClick(member)}
                    onDrag={stopPropagation}
                    onDragStart={stopPropagation}
                    onDragEnd={stopPropagation}
                >
                     <div
                        className={cn(
                            "p-1 rounded-full bg-card shadow-lg transition-all duration-300",
                            selectedMember?.id === member.id ? 'ring-4 ring-primary' : 'ring-2 ring-primary/50'
                        )}
                        >
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                     <div className="w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-card border-r-[6px] border-r-transparent -mt-1 shadow-lg"></div>
                    {selectedMember?.id === member.id && (
                        <div className="mt-2 p-2 bg-card text-card-foreground rounded-lg shadow-xl text-sm font-bold animate-in fade-in-50 zoom-in-90">
                            {member.name}
                        </div>
                    )}
                </div>

            </OverlayView>
        ))}
      </GoogleMap>
      {currentUser && (
        <Button
          size="icon"
          className="absolute bottom-10 right-4 z-10 rounded-full shadow-lg"
          onClick={handleCenterOnMe}
          title="Centrar en mi ubicación"
        >
          <Crosshair className="h-5 w-5" />
        </Button>
      )}
    </div>
  ) : (
    <Skeleton className="h-full w-full" />
  );
}
