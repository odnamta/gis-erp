'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Star,
  MoreVertical,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { ShippingLine, SERVICE_TYPE_LABELS } from '@/types/agency';
import Link from 'next/link';

interface ShippingLineCardProps {
  shippingLine: ShippingLine;
  onTogglePreferred: (id: string) => void;
  onDelete: (line: ShippingLine) => void;
}

export function ShippingLineCard({
  shippingLine,
  onTogglePreferred,
  onDelete,
}: ShippingLineCardProps) {
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg leading-none">
                {shippingLine.lineName}
              </h3>
              {shippingLine.isPreferred && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{shippingLine.lineCode}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/agency/shipping-lines/${shippingLine.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/agency/shipping-lines/${shippingLine.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePreferred(shippingLine.id)}>
                <Star className="mr-2 h-4 w-4" />
                {shippingLine.isPreferred ? 'Remove Preferred' : 'Mark Preferred'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(shippingLine)}
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
        {/* Services */}
        {shippingLine.servicesOffered.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {shippingLine.servicesOffered.slice(0, 4).map((service) => (
              <Badge key={service} variant="secondary" className="text-xs">
                {SERVICE_TYPE_LABELS[service]}
              </Badge>
            ))}
            {shippingLine.servicesOffered.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{shippingLine.servicesOffered.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Local Agent */}
        {shippingLine.localAgentName && (
          <div className="text-sm">
            <p className="text-muted-foreground text-xs mb-1">Local Agent</p>
            <p className="font-medium">{shippingLine.localAgentName}</p>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {shippingLine.localAgentPhone && (
            <a
              href={`tel:${shippingLine.localAgentPhone}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Phone className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{shippingLine.localAgentPhone}</span>
            </a>
          )}
          {shippingLine.localAgentEmail && (
            <a
              href={`mailto:${shippingLine.localAgentEmail}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{shippingLine.localAgentEmail}</span>
            </a>
          )}
          {shippingLine.website && (
            <a
              href={shippingLine.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Globe className="h-3 w-3" />
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <div className="flex items-center gap-1">
            {shippingLine.serviceRating ? (
              <>
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{shippingLine.serviceRating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No rating</span>
            )}
          </div>
          <div className="text-muted-foreground">
            Credit: {formatCurrency(shippingLine.creditLimit)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
