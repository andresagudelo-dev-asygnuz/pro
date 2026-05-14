import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProfileMorpho, ProfileConditional, ProfileTechnicalFootball, VisibilityLevel } from "@/lib/types/db";
import type { MorphoInput, ConditionalInput, TechnicalInput } from "@/lib/profiles/api";
import { MorphoForm } from "./MorphoForm";
import { ConditionalForm } from "./ConditionalForm";
import { TechnicalFootballForm } from "./TechnicalFootballForm";

interface Props {
  userId: string;
  morpho: ProfileMorpho | null;
  conditional: ProfileConditional | null;
  technical: ProfileTechnicalFootball | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateMorpho: (data: MorphoInput & { visibility: VisibilityLevel }) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateConditional: (data: ConditionalInput & { visibility: VisibilityLevel }) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateTechnical: (data: TechnicalInput & { visibility: VisibilityLevel }) => Promise<any>;
  isLoading: boolean;
}

export function ProfileBlocksTabs({
  morpho,
  conditional,
  technical,
  onUpdateMorpho,
  onUpdateConditional,
  onUpdateTechnical,
  isLoading,
}: Props) {
  return (
    <Tabs defaultValue="morpho" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="morpho" className="flex-1">Morfología</TabsTrigger>
        <TabsTrigger value="conditional" className="flex-1">Condición física</TabsTrigger>
        <TabsTrigger value="technical" className="flex-1">Técnica</TabsTrigger>
      </TabsList>

      <TabsContent value="morpho" className="mt-4">
        <MorphoForm
          initial={morpho ?? undefined}
          onSubmit={onUpdateMorpho}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent value="conditional" className="mt-4">
        <ConditionalForm
          initial={conditional ?? undefined}
          onSubmit={onUpdateConditional}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent value="technical" className="mt-4">
        <TechnicalFootballForm
          initial={technical ?? undefined}
          onSubmit={onUpdateTechnical}
          isLoading={isLoading}
        />
      </TabsContent>
    </Tabs>
  );
}
