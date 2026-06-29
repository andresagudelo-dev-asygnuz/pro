import { Component, type ReactNode, type ErrorInfo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface FallbackProps {
  onReset: () => void;
}

function ErrorFallback({ onReset }: FallbackProps) {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Algo salió mal en esta pantalla.</h2>
      <p className="text-muted-foreground max-w-sm">
        Ocurrió un error inesperado. Recargá la página o volvé al inicio.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recargar
        </Button>
        <Button
          variant="default"
          onClick={() => {
            navigate("/feed");
            onReset();
          }}
        >
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback onReset={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}
