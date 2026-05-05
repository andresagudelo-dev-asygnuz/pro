import React from "react";
import MomTestGame from "@/components/feedback/MomTestGame";
import "./feedback.css";

export const metadata = {
  title: "PRO Challenge | Validación Deportiva",
  description: "Únete al reto PRO y ayúdanos a transformar el deporte en Manizales.",
};

export default function FeedbackPage() {
  return (
    <main>
      <MomTestGame />
    </main>
  );
}
