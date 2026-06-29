import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      {icon && (
        <div className="h-10 w-10 text-muted-foreground flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {cta && (
        cta.href ? (
          <Link href={cta.href}>
            <Button variant="default" size="sm">{cta.label}</Button>
          </Link>
        ) : (
          <Button variant="default" size="sm" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )
      )}
    </div>
  );
}
