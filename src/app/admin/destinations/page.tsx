"use client"

import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockDestinations } from "@/lib/mock-data"

export default function AdminDestinations() {
  return (
    <div className="space-y-6">
      <PageHeader title="الوجهات">
        <Button>+ اضافة وجهة</Button>
      </PageHeader>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDestinations.map((destination) => (
          <Card key={destination.id} className="overflow-hidden py-0!">
            <div className="relative h-48 w-full">
              <Image
                src={destination.image}
                alt={destination.name.ar}
                fill
                className="object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-dark">
                    {destination.name.ar}
                  </h3>
                  <p className="text-sm text-text-muted mt-1 line-clamp-2">
                    {destination.description.ar}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="mr-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="me-2 h-4 w-4" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="me-2 h-4 w-4" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-300">
                <span className="text-sm text-text-muted">عدد الرحلات</span>
                <span className="text-lg font-bold text-duck-cyan">
                  {destination.trip_count}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
