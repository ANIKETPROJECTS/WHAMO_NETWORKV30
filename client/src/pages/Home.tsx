import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Box, FileCode, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              WHAMO <span className="text-primary">Designer</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Professional graphical interface for Water Hammer Mass Oscillation network modeling.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/designer">
              <Button size="lg" className="text-lg px-8 h-14 shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1">
                Start Designing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg h-14 bg-white/50 backdrop-blur">
              Documentation
            </Button>
          </div>

          <div className="pt-8 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Visual Topology</h3>
              <p className="text-xs text-muted-foreground">Drag & drop network layout</p>
            </div>
            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Smart Components</h3>
              <p className="text-xs text-muted-foreground">Reservoirs, surge tanks, and more</p>
            </div>
            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">INP Generation</h3>
              <p className="text-xs text-muted-foreground">Instant export to simulation</p>
            </div>
          </div>
        </div>

        <div className="relative hidden md:block group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
          <Card className="relative border-slate-200/50 shadow-2xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {/* Decorative mock interface */}
               <div className="h-[400px] relative bg-[url('https://pixabay.com/get/g128d9bd0062de47df28d64d70d2db0fc55d798185bb90a0cebe8d699133a61bd779e73c456b5777d0560c3022808016e90c74a1788505131556f8ced734cb387_1280.jpg')] bg-cover bg-center opacity-90 grayscale-[20%]">
                 <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px]" />
                 
                 {/* Mock Nodes */}
                 <div className="absolute top-1/4 left-1/4 p-4 bg-white rounded-lg shadow-lg border border-slate-200 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-blue-500 mx-auto mb-2" />
                    <div className="w-16 h-2 bg-slate-200 rounded" />
                 </div>

                 <div className="absolute bottom-1/3 right-1/3 p-4 bg-white rounded-lg shadow-lg border border-slate-200 delay-150 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-orange-500 mx-auto mb-2" />
                    <div className="w-16 h-2 bg-slate-200 rounded" />
                 </div>

                 {/* Mock Connection */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none">
                   <path d="M 180 150 C 300 150, 300 350, 450 350" stroke="currentColor" strokeWidth="3" fill="none" className="text-slate-400/50" />
                 </svg>
               </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
