import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NearestShelter from "@/components/NearestShelter";
import WeatherCard from "@/components/WeatherCard";
import SensorCard from "@/components/SensorCard";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* ── SECTION 1: USER STORY ── */}
        <section id="story" className="min-h-screen flex flex-col justify-center items-center px-8 py-32 text-center">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">Why SafeSpot?</p>
          <h1 className="text-5xl font-bold mb-8 leading-tight max-w-3xl">
            In 2021, a heat dome killed 570 people in British Columbia.
          </h1>
          <p className="text-gray-300 max-w-2xl text-xl mb-6">
            Many victims lived near cooling centres — but had no way of knowing.
            If they had received a real-time alert and been guided to the nearest safe space,
            more lives could have been saved.
          </p>
          <p className="text-orange-400 text-lg font-medium mb-6">
            SafeSpot detects extreme heat in real time and routes you to the nearest cooling centre via GPS.
          </p>
          <p className="text-xs text-gray-600">
            Source:{" "}
            <a
              href="https://www.cbc.ca/news/canada/british-columbia/bc-heat-dome-sudden-deaths-570-1.6122316"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-400 transition-colors"
            >
              CBC News — B.C. heat dome: Death toll rises to 570 (July 27, 2021)
            </a>
          </p>
        </section>

        {/* ── SECTION 2: HOW IT WORKS ── */}
        <section id="how-it-works" className="min-h-screen flex flex-col justify-center items-center px-8 py-32 bg-zinc-950">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">How It Works</p>
          <h2 className="text-4xl font-bold mb-4">From Sensor to Safety</h2>
          <p className="text-gray-500 text-sm mb-16 text-center max-w-md">
            Unlike weather apps that report a city-wide average,<br />
            SafeSpot measures the <span className="text-orange-400 font-medium">actual temperature where you are</span>.
          </p>

          <div className="flex flex-col items-center gap-0 w-full max-w-lg">
            {[
              {
                icon: "🍓",
                label: "Measure Real Local Heat",
                sub: "A Raspberry Pi sensor deployed in a heat island zone captures the actual ground-level temperature — not a city-wide average.",
                badge: "Hardware",
                badgeColor: "bg-orange-900 text-orange-300",
              },
              {
                icon: "🗺️",
                label: "Map Urban Heat Zones",
                sub: "ArcGIS data overlays Toronto's heat island zones on an interactive map — so you can see which neighbourhoods are most at risk.",
                badge: "GIS Data",
                badgeColor: "bg-purple-900 text-purple-300",
              },
              {
                icon: "📍",
                label: "Find You",
                sub: "Browser GPS pinpoints your exact location in real time.",
                badge: "GPS",
                badgeColor: "bg-cyan-900 text-cyan-300",
              },
              {
                icon: "🔬",
                label: "Cross-Check Your Risk",
                sub: "Your location is checked against the heat island map. Being in a heat island zone during a heat wave is far more dangerous than either factor alone — so we combine both to calculate your actual risk level.",
                badge: "Risk Engine",
                badgeColor: "bg-pink-900 text-pink-300",
              },
              {
                icon: "🚨",
                label: "Trigger a Danger Alert",
                sub: "When the sensor reads 35°C or above AND you are in a heat island zone, a full-screen warning fires — with sound and push notification.",
                badge: "Alert System",
                badgeColor: "bg-red-900 text-red-300",
              },
              {
                icon: "🏛️",
                label: "Route You to Safety",
                sub: "The app instantly calculates your nearest cooling centre or library and opens Google Maps directions.",
                badge: "Routing",
                badgeColor: "bg-green-900 text-green-300",
              },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center w-full">
                <div className="border border-zinc-700 rounded-2xl px-8 py-5 bg-zinc-900 w-full flex items-start gap-5">
                  <div className="text-3xl mt-0.5 shrink-0">{step.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{step.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step.badgeColor}`}>
                        {step.badge}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">{step.sub}</div>
                  </div>
                </div>
                {i < 5 && <div className="text-gray-700 text-2xl my-1">↓</div>}
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: LIVE MAP DASHBOARD ── */}
        <section id="dashboard" className="flex flex-col items-center px-8 py-24">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">Live Dashboard</p>
          <h2 className="text-4xl font-bold mb-2">Real-Time Safety Map</h2>
          <p className="text-gray-400 mb-10 text-center">
            Heat island zones · Cooling centres · Libraries · Your location — all in one map
          </p>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-5 mb-8 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{backgroundColor:"#8B0000"}}/><span>High Heat Area</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{backgroundColor:"#FF0000"}}/><span>Medium Heat Area</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{backgroundColor:"#f97316"}}/><span>Low Heat Area</span></span>
            <span className="flex items-center gap-1.5"><span>❄️</span><span>Cooling Centre</span></span>
            <span className="flex items-center gap-1.5"><span>📚</span><span>Library</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"/><span>You</span></span>
          </div>

          {/* Temperature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-6">
            <SensorCard />
            <WeatherCard />
          </div>

          {/* GPS + full map + nearest shelter */}
          <NearestShelter />
        </section>
      </main>

      <Footer />
    </>
  );
}
