import { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Feature {
  title: string;
  description: string;
  imageUrl: string;
}

const features: Feature[] = [
  {
    title: "Runner Score Dashboard",
    description: "Get your comprehensive 0-100 performance rating with beautiful radar charts showing consistency, performance, volume, and improvement.",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60",
  },
  {
    title: "AI-Powered Insights",
    description: "Personalized performance analysis, training recommendations, and injury risk monitoring powered by GPT-5.",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60",
  },
  {
    title: "Running Heatmap",
    description: "Visualize your favorite routes with interactive maps showing where you run most frequently across all your activities.",
    imageUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=60",
  },
  {
    title: "Race Predictions",
    description: "ML-powered predictions for 5K, 10K, half marathon, and marathon distances based on your recent training data.",
    imageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=60",
  },
  {
    title: "Performance Analytics",
    description: "Track your progress with interactive charts, heart rate zone analysis, and comprehensive performance metrics.",
    imageUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=60",
  },
];

export function FeatureCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: "center",
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(autoplay);
  }, [emblaApi]);

  return (
    <div className="relative max-w-4xl mx-auto px-4">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0 px-4"
            >
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-100 to-purple-100">
                  <img
                    src={feature.imageUrl}
                    alt={feature.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-white/90">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 bg-white/90 hover:bg-white shadow-lg rounded-full w-10 h-10 sm:w-12 sm:h-12"
        onClick={scrollPrev}
        data-testid="carousel-prev"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 bg-white/90 hover:bg-white shadow-lg rounded-full w-10 h-10 sm:w-12 sm:h-12"
        onClick={scrollNext}
        data-testid="carousel-next"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    </div>
  );
}
