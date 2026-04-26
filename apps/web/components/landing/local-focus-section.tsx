"use client";

export function LocalFocusSection() {
  return (
    <section
      className="relative py-32 bg-fixed bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=2000&auto=format&fit=crop")' }}
    >
      <div className="absolute inset-0 bg-black/85 z-10" />

      <div className="container px-4 mx-auto relative z-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
              Pensado para deportistas apasionados
            </h2>
            <p className="text-xl text-zinc-400 mb-12">
              Nacimos para potenciar el talento local. Sabemos que en cada barrio hay un crack y en cada equipo hay una historia que merece ser contada.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden h-40">
                <img
                  src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=600&auto=format&fit=crop"
                  alt="Deporte Local"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="rounded-2xl overflow-hidden h-40">
                <img
                  src="https://images.unsplash.com/photo-1526232762682-d2f5f717d33b?q=80&w=600&auto=format&fit=crop"
                  alt="Pasión Deportiva"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                />
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" />
            <div className="glass p-1 rounded-3xl overflow-hidden aspect-square md:aspect-video lg:aspect-square relative z-10">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127258.1182283852!2d-75.59021235!3d5.0688941!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e476563604f32c7%3A0xc3c9489679133464!2sManizales%2C%20Caldas!5e0!3m2!1ses!2sco!4v1714000000000!5m2!1ses!2sco"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale contrast-125 opacity-80"
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                <div className="w-4 h-4 bg-primary rounded-full absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
