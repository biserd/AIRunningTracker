import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Database, CheckCircle, AlertTriangle, RefreshCw, Plus, Search, Filter, BarChart3 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import type { RunningShoe } from "@shared/schema";

interface PipelineStats {
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    byBrand: Record<string, number>;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
  };
  duplicates: { brand: string; model: string; count: number }[];
  databaseCount: number;
  seedDataCount: number;
}

interface ValidationResult {
  totalShoes: number;
  validShoes: number;
  invalidShoes: number;
  stats: PipelineStats["stats"];
  errors: { brand: string; model: string; errors: string[] }[];
}

const CATEGORIES = [
  { value: "daily_trainer", label: "Daily Trainer" },
  { value: "racing", label: "Racing" },
  { value: "long_run", label: "Long Run" },
  { value: "recovery", label: "Recovery" },
  { value: "speed_training", label: "Speed Training" },
  { value: "trail", label: "Trail" },
];

const BRANDS = [
  "Nike", "Brooks", "Hoka", "Asics", "New Balance", "Saucony", 
  "On", "Altra", "Adidas", "Puma", "Mizuno", "Salomon", 
  "La Sportiva", "Reebok", "Under Armour", "361°"
];

export default function AdminShoesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: shoes, isLoading: shoesLoading } = useQuery<RunningShoe[]>({
    queryKey: ["/api/shoes"],
    enabled: !!user,
  });

  const { data: pipelineStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<PipelineStats>({
    queryKey: ["/api/shoes/pipeline/stats"],
    enabled: !!user,
    retry: false,
  });

  const { data: validation, isLoading: validationLoading, refetch: refetchValidation } = useQuery<ValidationResult>({
    queryKey: ["/api/shoes/pipeline/validate"],
    enabled: !!user,
    retry: false,
  });

  const seedMutation = useMutation({
    mutationFn: async (force: boolean) => {
      return apiRequest(`/api/shoes/seed${force ? '?force=true' : ''}`, 'POST');
    },
    onSuccess: () => {
      toast({ title: "Database seeded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/shoes"] });
      refetchStats();
      refetchValidation();
    },
    onError: (error: any) => {
      toast({ title: "Failed to seed database", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
    if (user && !user.isAdmin) {
      toast({ title: "Access denied", description: "Admin privileges required", variant: "destructive" });
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation, toast]);

  if (authLoading || !user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredShoes = shoes?.filter(shoe => {
    const matchesSearch = searchTerm === "" || 
      shoe.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shoe.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === "all" || shoe.brand === brandFilter;
    const matchesCategory = categoryFilter === "all" || shoe.category === categoryFilter;
    return matchesSearch && matchesBrand && matchesCategory;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="admin-shoes-title">
              <ShoppingBag className="w-8 h-8 text-primary" />
              Running Shoe Database Admin
            </h1>
            <p className="text-muted-foreground mt-1">Manage shoe data, validate entries, and monitor pipeline health</p>
          </div>
          <Button 
            onClick={() => setLocation("/admin")} 
            variant="outline"
            data-testid="back-to-admin-btn"
          >
            Back to Admin
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList data-testid="admin-shoes-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="shoes" data-testid="tab-shoes">All Shoes</TabsTrigger>
            <TabsTrigger value="validation" data-testid="tab-validation">Validation</TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline">Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Shoes</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-shoes">
                    {shoes?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">in database</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Seed Data</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-seed-count">
                    {pipelineStats?.seedDataCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">shoes in seed file</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Brands</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-brands">
                    {pipelineStats?.stats.byBrand ? Object.keys(pipelineStats.stats.byBrand).length : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">unique brands</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-categories">
                    {pipelineStats?.stats.byCategory ? Object.keys(pipelineStats.stats.byCategory).length : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">shoe categories</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shoes by Brand</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {pipelineStats?.stats.byBrand && Object.entries(pipelineStats.stats.byBrand)
                      .sort(([,a], [,b]) => b - a)
                      .map(([brand, count]) => (
                        <div key={brand} className="flex items-center justify-between">
                          <span className="text-sm">{brand}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shoes by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pipelineStats?.stats.byCategory && Object.entries(pipelineStats.stats.byCategory)
                      .sort(([,a], [,b]) => b - a)
                      .map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Database Actions</CardTitle>
                <CardDescription>Manage the shoe database</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button 
                  onClick={() => seedMutation.mutate(false)}
                  disabled={seedMutation.isPending}
                  data-testid="seed-btn"
                >
                  {seedMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Seed Database
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => seedMutation.mutate(true)}
                  disabled={seedMutation.isPending}
                  data-testid="force-seed-btn"
                >
                  {seedMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Force Reseed
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shoes" className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by brand or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label>Brand</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger data-testid="brand-filter">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {BRANDS.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Weight (oz)</TableHead>
                        <TableHead>Drop (mm)</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shoesLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredShoes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No shoes found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredShoes.map(shoe => (
                          <TableRow key={shoe.id} data-testid={`shoe-row-${shoe.id}`}>
                            <TableCell className="font-medium">{shoe.brand}</TableCell>
                            <TableCell>{shoe.model}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {shoe.category.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{shoe.weight}</TableCell>
                            <TableCell>{shoe.heelToToeDrop}</TableCell>
                            <TableCell>${shoe.price}</TableCell>
                            <TableCell>{shoe.releaseYear}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {(shoe as any).dataSource || 'curated'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              Showing {filteredShoes.length} of {shoes?.length || 0} shoes
            </p>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Data Validation</h2>
              <Button onClick={() => refetchValidation()} disabled={validationLoading} data-testid="refresh-validation-btn">
                <RefreshCw className={`w-4 h-4 mr-2 ${validationLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valid Shoes</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="valid-count">
                    {validation?.validShoes || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Invalid Shoes</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600" data-testid="invalid-count">
                    {validation?.invalidShoes || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="validation-rate">
                    {validation?.totalShoes 
                      ? Math.round((validation.validShoes / validation.totalShoes) * 100)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {validation?.errors && validation.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Validation Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {validation.errors.map((item, index) => (
                      <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                        <p className="font-medium">{item.brand} {item.model}</p>
                        <ul className="list-disc list-inside text-sm text-red-600">
                          {item.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {validation?.errors && validation.errors.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-600">All shoes pass validation</p>
                  <p className="text-sm text-muted-foreground">No validation errors found in the database</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Data Pipeline</h2>
              <Button onClick={() => refetchStats()} disabled={statsLoading} data-testid="refresh-stats-btn">
                <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>Distribution of shoe data by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pipelineStats?.stats.bySource && Object.entries(pipelineStats.stats.bySource).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={source === 'manufacturer' ? 'default' : source === 'curated' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {source.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {source === 'manufacturer' ? '(highest trust)' : 
                           source === 'curated' ? '(verified)' : 
                           source === 'user_submitted' ? '(needs review)' : ''}
                        </span>
                      </div>
                      <span className="font-medium">{count} shoes</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {pipelineStats?.duplicates && pipelineStats.duplicates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Duplicates Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pipelineStats.duplicates.map((dup, index) => (
                      <div key={index} className="flex items-center justify-between border-l-4 border-yellow-500 pl-4">
                        <span>{dup.brand} {dup.model}</span>
                        <Badge variant="destructive">{dup.count} entries</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {pipelineStats?.duplicates && pipelineStats.duplicates.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-600">No duplicates detected</p>
                  <p className="text-sm text-muted-foreground">All shoe entries are unique</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
