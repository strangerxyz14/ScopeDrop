
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { FundingRound } from "@/types/news";
import FundingCard from "./FundingCard";
import { Link } from "react-router-dom";

interface HeroSectionProps {
  fundingRounds?: FundingRound[];
  isLoading?: boolean;
}

const HeroSection = ({ fundingRounds = [], isLoading = false }: HeroSectionProps) => {
  return (
    <section className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
              Discover the Future of Business & Technology
            </h1>
            <p className="text-xl text-blue-100">
              Your daily source for startup intelligence: funding rounds, market insights, 
              founder stories, and tech breakthroughs.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild className="bg-parrot text-oxford hover:bg-parrot-400">
                <Link to="/newsletter">Subscribe to Newsletter</Link>
              </Button>
              <Button variant="outline" className="text-white border-white hover:bg-white/10">
                <Link to="/funding/rounds">Latest Funding</Link>
              </Button>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-display font-bold mb-6 flex items-center">
              <span className="bg-parrot h-6 w-1 rounded mr-3"></span>
              Latest Funding Rounds
            </h2>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/10 animate-pulse h-32 rounded-lg"></div>
                ))}
              </div>
            ) : fundingRounds.length > 0 ? (
              <Carousel
                opts={{
                  align: "start",
                }}
                className="w-full"
              >
                <CarouselContent>
                  {fundingRounds.map((round, index) => (
                    <CarouselItem key={index} className="md:basis-1/1">
                      <div className="p-1">
                        <FundingCard fundingRound={round} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="flex justify-center mt-4 space-x-4">
                  <CarouselPrevious className="relative static" />
                  <CarouselNext className="relative static" />
                </div>
              </Carousel>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60">No funding rounds available.</p>
                <Button variant="outline" className="mt-4 border-white text-white hover:bg-white hover:text-oxford">
                  <Link to="/funding/rounds">Browse All Funding</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
