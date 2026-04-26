export function MainFooter() {
  return (
    <footer className="py-12 bg-background border-t">
      <div className="container px-4 mx-auto text-center text-muted-foreground">
        <div className="text-3xl font-bold text-foreground mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary inline-block">
          PRO
        </div>
        <p className="text-sm">© {new Date().getFullYear()} PRO — Comunidad Deportiva Aficionada. Todos los derechos reservados.</p>
        <div className="flex justify-center gap-6 mt-6">
          <span className="text-xs opacity-50">Términos y Condiciones</span>
          <span className="text-xs opacity-50">Privacidad</span>
          <span className="text-xs opacity-50">Contacto</span>
        </div>
        <p className="text-[10px] mt-8 opacity-30 uppercase tracking-widest">Hecho con pasión en Manizales, Caldas, Colombia 🇨🇴</p>
      </div>
    </footer>
  );
}
