"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { 
  Users, Search, Phone, Mail, Calendar, 
  MapPin, CreditCard, History, ChevronRight,
  TrendingUp, Star, PhoneCall
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function CustomersPage() {
  const guests = useQuery(api.guests.list) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <DesktopTopbar title="Customer Directory" />
      
      <main className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Customers</p>
                <p className="text-3xl font-bold">{guests.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Loyal Guests (3+ visits)</p>
                <p className="text-3xl font-bold">{guests.filter(g => g.totalVisits >= 3).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Star size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Top Spenders</p>
                <p className="text-3xl font-bold">{guests.filter(g => g.totalSpend >= 50000).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <div className="flex-1 bg-card rounded-3xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/30">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Search by name or phone..." 
                className="pl-10 h-11 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11">Export CSV</Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[300px]">Guest Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Identity Details</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredGuests.map((guest) => (
                    <TableRow key={guest._id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {guest.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{guest.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">Guest Profile</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{guest.phone}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none px-3">
                          {guest.totalVisits} {guest.totalVisits === 1 ? 'Visit' : 'Visits'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        ₹{guest.totalSpend.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        {guest.idType ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold uppercase opacity-60">{guest.idType}</span>
                            <span className="text-[10px] tabular-nums">{guest.idNumber}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Sheet>
                          <SheetTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-full h-8 px-4"
                                onClick={() => setSelectedGuest(guest)}
                              >
                                View Ledger <ChevronRight size={14} className="ml-1" />
                              </Button>
                            }
                          />
                          {selectedGuest && <GuestDetailsSheet guest={selectedGuest} />}
                        </Sheet>

                      </TableCell>
                    </TableRow>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            
            {filteredGuests.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6 text-muted-foreground">
                  <Users size={40} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No customers found</h3>
                <p className="text-muted-foreground max-w-sm">
                  {searchTerm ? `We couldn't find any results matching "${searchTerm}". Try a different name or phone number.` : "Guests will appear here once they make their first booking or order."}
                </p>
                {searchTerm && (
                  <Button variant="link" className="mt-4" onClick={() => setSearchTerm("")}>Clear search</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function GuestDetailsSheet({ guest }: { guest: any }) {
  const history = useQuery(api.guests.getHistory, { phone: guest.phone, name: guest.name });

  return (
    <SheetContent className="sm:max-w-xl md:max-w-2xl bg-background flex flex-col p-0 gap-0 border-l border-border shadow-2xl">
      <div className="bg-muted/30 p-8 border-b">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-serif shadow-xl shadow-primary/20">
              {guest.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <SheetTitle className="text-3xl font-serif text-foreground leading-tight">{guest.name}</SheetTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="bg-background/50 flex items-center gap-1.5 py-1 px-3">
                  <Phone size={12} className="text-primary" /> {guest.phone}
                </Badge>
                {guest.idNumber && (
                  <Badge variant="outline" className="bg-background/50 flex items-center gap-1.5 py-1 px-3 uppercase text-[10px] tracking-widest">
                    <CreditCard size={12} className="text-primary" /> {guest.idType}: {guest.idNumber}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-background/50 rounded-2xl p-4 border border-border/50">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total Visits</p>
              <p className="text-2xl font-bold text-foreground">{guest.totalVisits}</p>
            </div>
            <div className="bg-background/50 rounded-2xl p-4 border border-border/50">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Avg. Ticket</p>
              <p className="text-2xl font-bold text-foreground">₹{Math.round(guest.totalSpend / guest.totalVisits).toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-background/50 rounded-2xl p-4 border border-border/50">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">LTV</p>
              <p className="text-2xl font-bold text-primary">₹{guest.totalSpend.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </SheetHeader>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="bookings" className="w-full flex-1 flex flex-col">
          <div className="px-8 bg-muted/30 border-b">
            <TabsList className="bg-transparent h-12 gap-6 p-0 w-full justify-start rounded-none">
              <TabsTrigger value="bookings" className="bg-transparent p-0 h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold uppercase tracking-widest text-[10px]">
                Room History
              </TabsTrigger>
              <TabsTrigger value="banquets" className="bg-transparent p-0 h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold uppercase tracking-widest text-[10px]">
                Banquets
              </TabsTrigger>
              <TabsTrigger value="bills" className="bg-transparent p-0 h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold uppercase tracking-widest text-[10px]">
                F&B Ledger
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-8 pb-12">
              <TabsContent value="bookings" className="mt-0 outline-none">
                <div className="space-y-4">
                  {history?.roomBookings.length === 0 ? (
                    <EmptyState label="No room bookings found" icon={Calendar} />
                  ) : (
                    history?.roomBookings.map((b: any) => (
                      <HistoryCard 
                        key={b._id}
                        title={`Luxury Room ${b.folioNumber || ''}`}
                        date={`${b.checkIn} to ${b.checkOut}`}
                        amount={b.totalAmount}
                        status={b.status}
                        icon={Calendar}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="banquets" className="mt-0 outline-none">
                <div className="space-y-4">
                  {history?.banquetBookings.length === 0 ? (
                    <EmptyState label="No banquet history" icon={Star} />
                  ) : (
                    history?.banquetBookings.map((b: any) => (
                      <HistoryCard 
                        key={b._id}
                        title={b.eventName}
                        date={b.eventDate}
                        amount={b.totalAmount}
                        status={b.status}
                        icon={Star}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="bills" className="mt-0 outline-none">
                <div className="space-y-4">
                  {history?.bills.length === 0 ? (
                    <EmptyState label="No bills found" icon={CreditCard} />
                  ) : (
                    history?.bills.map((b: any) => (
                      <HistoryCard 
                        key={b._id}
                        title={`${b.billType.charAt(0).toUpperCase() + b.billType.slice(1)} Bill`}
                        date={b.createdAt}
                        amount={b.totalAmount}
                        status={b.status}
                        icon={CreditCard}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      <div className="p-6 border-t bg-muted/30 flex gap-4">
        <Button className="flex-1 h-12 rounded-xl gap-2 active:scale-95 transition-transform" onClick={() => window.open(`tel:${guest.phone}`)}>
          <PhoneCall size={18} /> Contact Guest
        </Button>
        <Button variant="outline" className="flex-1 h-12 rounded-xl gap-2 active:scale-95 transition-transform">
          <Mail size={18} /> Send Invoice
        </Button>
      </div>
    </SheetContent>
  );
}

function HistoryCard({ title, date, amount, status, icon: Icon }: any) {
  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "confirmed":
      case "completed":
      case "paid": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "checked_in": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
    }
  };

  return (
    <div className="p-4 rounded-2xl border bg-card hover:shadow-md transition-all flex items-center gap-4 group cursor-default">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-foreground truncate leading-tight">{title}</h4>
          <span className="font-bold text-sm text-foreground">₹{amount.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between items-baseline mt-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{date}</p>
          <Badge variant="outline" className={`text-[9px] px-2 py-0 border leading-relaxed ${getStatusColor(status)} uppercase tracking-wider`}>
            {status.replace('_', ' ')}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label, icon: Icon }: any) {
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-50 bg-muted/10">
      <Icon size={32} className="mb-4 text-muted-foreground" />
      <p className="text-sm font-medium uppercase tracking-widest">{label}</p>
    </div>
  );
}
