'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Star, MoreVertical, Pencil, Trash2, Eye, Globe, Phone, Mail, MapPin, Anchor } from 'lucide-react';
import { PortAgent, PORT_AGENT_SERVICE_LABELS } from '@/types/agency';

interface PortAgentCardProps {
  portAgent: PortAgent;
  onDelete: (agent: PortAgent) => void;
}

export function PortAgentCard({ portAgent, onDelete }: PortAgentCardProps) {
  const router = useRouter();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{portAgent.agentName}</CardTitle>
              {portAgent.isPreferred && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{portAgent.agentCode}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/agency/port-agents/${portAgent.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/agency/port-agents/${portAgent.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(portAgent)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Port Location */}
        <div className="flex items-center gap-2 text-sm">
          <Anchor className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{portAgent.portName}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{portAgent.portCountry}</span>
        </div>

        {/* Services */}
        {portAgent.services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {portAgent.services.slice(0, 4).map((service) => (
              <Badge key={service} variant="secondary" className="text-xs">
                {PORT_AGENT_SERVICE_LABELS[service]}
              </Badge>
            ))}
            {portAgent.services.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{portAgent.services.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Rating */}
        {portAgent.serviceRating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Rating:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 ${
                    star <= Math.round(portAgent.serviceRating!)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-1 font-medium">{portAgent.serviceRating.toFixed(1)}</span>
              {portAgent.ratingCount && (
                <span className="text-muted-foreground ml-1">({portAgent.ratingCount})</span>
              )}
            </div>
          </div>
        )}

        {/* Licenses */}
        {(portAgent.customsLicense || portAgent.ppjkLicense) && (
          <div className="text-sm space-y-1">
            {portAgent.customsLicense && (
              <div>
                <span className="text-muted-foreground">Customs License:</span>{' '}
                <span className="font-medium">{portAgent.customsLicense}</span>
              </div>
            )}
            {portAgent.ppjkLicense && (
              <div>
                <span className="text-muted-foreground">PPJK License:</span>{' '}
                <span className="font-medium">{portAgent.ppjkLicense}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-2 border-t">
          {portAgent.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[150px]">{portAgent.address}</span>
            </div>
          )}
          {portAgent.website && (
            <a 
              href={portAgent.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
            </a>
          )}
          {portAgent.phone && (
            <a 
              href={`tel:${portAgent.phone}`}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {portAgent.phone}
            </a>
          )}
          {portAgent.email && (
            <a 
              href={`mailto:${portAgent.email}`}
              className="flex items-center gap-1 hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
