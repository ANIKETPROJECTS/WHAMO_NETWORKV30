import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Designer from "@/pages/Designer";
import AdminPanel from "@/pages/AdminPanel";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Login} />
      <Route path="/admin">
        <AuthGuard>
          <AdminPanel />
        </AuthGuard>
      </Route>
      <Route path="/designer">
        <AuthGuard>
          <Designer />
        </AuthGuard>
      </Route>
      <Route path="/">
        <AuthGuard>
          <Designer />
        </AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
