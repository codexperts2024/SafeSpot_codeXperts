import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NearestShelter from "@/components/NearestShelter";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* ── SECTION 1: USER STORY ── */}
        <section id="story" className="min-h-screen flex flex-col justify-center items-center px-8 py-32 text-center">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">Why SafeSpot?</p>
          <h1 className="text-5xl font-bold mb-8 leading-tight max-w-3xl">
            In 2021, a deadly heatwave killed hundreds in Vancouver.
          </h1>
          <p className="text-gray-400 max-w-xl text-lg mb-4">
            [News article link — Vancouver heat dome, June 2021]
          </p>
          <p className="text-gray-300 max-w-2xl text-xl mb-6">
            Many victims lived near cooling centres — but had no way of knowing.
            If they had received a real-time alert and been guided to the nearest safe space,
            more lives could have been saved.
          </p>
          <p className="text-orange-400 text-lg font-medium">
            SafeSpot detects extreme heat in real time and routes you to the nearest cooling centre via GPS.
          </p>
        </section>

        {/* ── SECTION 2: ACTIVITY DIAGRAM ── */}
        <section id="how-it-works" className="min-h-screen flex flex-col justify-center items-center px-8 py-32 bg-zinc-950">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">How It Works</p>
          <h2 className="text-4xl font-bold mb-16">System Flow</h2>

          <div className="flex flex-col items-center gap-0 w-full max-w-sm">
            {[
              { icon: "🌡️", label: "Temperature Detected", sub: "Raspberry Pi Temperature Sensor" },
              { icon: "📍", label: "Location Identified", sub: "Browser GPS Location API" },
              { icon: "🚨", label: "Alert Triggered", sub: "Threshold Alert at 35°C+" },
              { icon: "🏛️", label: "Nearest Safe Space Found", sub: "Cooling Centre & Library Routing" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center w-full">
                <div className="border border-zinc-700 rounded-2xl px-8 py-5 text-center bg-zinc-900 w-full">
                  <div className="text-3xl mb-2">{step.icon}</div>
                  <div className="font-semibold text-white">{step.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{step.sub}</div>
                </div>
                {i < 3 && <div className="text-gray-600 text-2xl my-1">↓</div>}
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: MAP LAYERS ── */}
        <section id="map-layers" className="min-h-screen flex flex-col justify-center items-center px-8 py-32">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">Data Layers</p>
          <h2 className="text-4xl font-bold mb-4">Map Data Layers</h2>
          <p className="text-gray-400 mb-16">Four layers stack together to build Toronto's heat risk map</p>

          <div className="flex flex-col gap-4 w-full max-w-lg">
            {[
              { num: "01", label: "Toronto Base Map",              desc: "Base map of Toronto (Leaflet + OpenStreetMap)",       color: "border-blue-800" },
              { num: "02", label: "Urban Heat Island Effect",      desc: "Heat island zones — ArcGIS REST API (Seneca)",        color: "border-orange-800" },
              { num: "03", label: "Air Conditioned & Cool Spaces", desc: "Cooling space locations — City of Toronto Open Data", color: "border-cyan-800" },
              { num: "04", label: "Library Branch Locations",      desc: "Library branches — City of Toronto Open Data",        color: "border-green-800" },
            ].map((layer) => (
              <div key={layer.num} className={`border ${layer.color} rounded-xl px-6 py-4 bg-zinc-900 flex items-center gap-4`}>
                <span className="text-2xl font-bold text-gray-600 w-10">{layer.num}</span>
                <div>
                  <div className="font-semibold text-white">{layer.label}</div>
                  <div className="text-sm text-gray-500">{layer.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 w-full max-w-lg h-72 bg-zinc-900 border border-zinc-700 rounded-2xl flex items-center justify-center text-gray-600">
            [ Leaflet map goes here ]
          </div>
        </section>

        {/* ── SECTION 4: LIVE DASHBOARD ── */}
        <section id="dashboard" className="min-h-screen flex flex-col justify-center items-center px-8 py-32 bg-zinc-950">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">Live Dashboard</p>
          <h2 className="text-4xl font-bold mb-4">Real-Time Dashboard</h2>
          <p className="text-gray-400 mb-16">Raspberry Pi sensor + GPS combined into a live safety map</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-10">
            {/* Temperature card — Marcos / Gary */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
              <p className="text-sm text-gray-500 mb-2">🌡️ Live Temperature</p>
              <div className="text-5xl font-bold text-orange-400">-- °C</div>
              <p className="text-xs text-gray-600 mt-3">Live reading from the Raspberry Pi temperature sensor</p>
              <div className="mt-4 h-2 bg-zinc-800 rounded-full">
                <div className="h-2 w-0 bg-orange-400 rounded-full" />
              </div>
            </div>

            {/* GPS card + map + nearest result — Arun */}
            <NearestShelter />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
