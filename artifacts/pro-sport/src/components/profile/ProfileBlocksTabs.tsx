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
  onChangeMorpho: (data: MorphoInput & { visibility: VisibilityLevel }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChangeConditional: (data: ConditionalInput & { visibility: VisibilityLevel }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChangeTechnical: (data: TechnicalInput & { visibility: VisibilityLevel }) => void;
  isLoading: boolean;
}

export function ProfileBlocksTabs({
  morpho,
  conditional,
  technical,
  onChangeMorpho,
  onChangeConditional,
  onChangeTechnical,
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
          onChange={onChangeMorpho}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent value="conditional" className="mt-4">
        <ConditionalForm
          initial={conditional ?? undefined}
          onChange={onChangeConditional}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent value="technical" className="mt-4">
        <TechnicalFootballForm
          initial={technical ?? undefined}
          onChange={onChangeTechnical}
          isLoading={isLoading}
        />
      </TabsContent>
    </Tabs>
  );
}
