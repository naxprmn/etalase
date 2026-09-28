import sys
import re

with open('src/views/landing/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_right = r"\{/\* Right Content - The Calendars \*/\}(.*?)</div>\s*</div>\s*</div>\s*</section>"

replacement_right = """{/* Right Content - The Calendars */}
              <div className="w-full lg:w-[50%] flex justify-center lg:justify-end mt-16 lg:mt-0 relative z-20">
                <div className="relative w-full max-w-[650px] aspect-[4/3] flex items-center justify-center">
                  
                  {/* Abstract Blue Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[70%] bg-[#346BFF] opacity-[0.08] blur-[80px] pointer-events-none -z-10"></div>

                  {/* Layer 1: Background Floating Cards (kalender_header.png) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-[62%] -translate-y-[45%] w-[110%] sm:w-[125%] z-0 pointer-events-none">
                    <img 
                      src="/assets/kalender_header.png" 
                      alt="Background decorative cards" 
                      className="w-full h-auto object-contain opacity-95"
                    />
                  </div>

                  {/* Layer 2: The Core Calendar UI (Flat Mac Window) */}
                  <div className="absolute top-1/2 right-[5%] -translate-y-[40%] w-[75%] sm:w-[80%] z-10 flex items-center justify-end drop-shadow-2xl">
                    <img 
                      src="/assets/kalender_asli_hd.png" 
                      alt="ETALASE Calendar Illustration" 
                      className="w-full h-auto object-contain cursor-pointer transition-transform hover:scale-[1.02]" 
                      onClick={() => {
                        document.getElementById('section-kalender')?.scrollIntoView({ behavior: 'smooth' })
                      }} 
                    />
                  </div>

                  {/* Layer 3: The Floating Event Card ("8 Sept 2026") */}
                  <div className="absolute bottom-[2%] right-[5%] sm:right-[15%] z-20 pointer-events-none drop-shadow-2xl">
                    <img 
                      src="/assets/floating_event_card.png" 
                      alt="Event Card" 
                      className="w-[200px] md:w-[260px] h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>"""

new_content = re.sub(pattern_right, replacement_right, content, flags=re.DOTALL)

if content == new_content:
    print("Failed to replace!")
else:
    print("Success!")
    with open('src/views/landing/index.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)

