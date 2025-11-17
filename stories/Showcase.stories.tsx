import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Meta, StoryObj } from "@storybook/nextjs";
import {
  Calendar,
  Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const meta: Meta = {
  title: "Examples/Complete UI Showcase",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const RecruitmentDashboard: Story = {
  render: () => (
    <div className="bg-background p-8 min-h-dvh">
      <div className="space-y-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-3xl">Recruitment Dashboard</h1>
            <p className="text-muted-foreground">
              Manage candidates and positions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Search className="mr-2 w-4 h-4" />
              Search
            </Button>
            <Button>
              <Plus className="mr-2 w-4 h-4" />
              Add Candidate
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-bold text-2xl">1,234</CardTitle>
              <CardDescription>Total Candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-green-600 text-sm">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-bold text-2xl">89</CardTitle>
              <CardDescription>Active Interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-blue-600 text-sm">+5% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-bold text-2xl">56</CardTitle>
              <CardDescription>Open Positions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-orange-600 text-sm">+8% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-bold text-2xl">23</CardTitle>
              <CardDescription>Offers Extended</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-purple-600 text-sm">+15% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Find Candidates</CardTitle>
            <CardDescription>
              Search and filter through your candidate pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                  <Input placeholder="Search candidates..." className="pl-10" />
                </div>
              </div>
              <Button variant="outline">Filter</Button>
              <Button variant="outline">Sort</Button>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage
                      src="/placeholder-user.jpg"
                      alt="Sarah Johnson"
                    />
                    <AvatarFallback>SJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Sarah Johnson</CardTitle>
                    <CardDescription>Senior Frontend Developer</CardDescription>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4" />
                sarah.johnson@email.com
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4" />
                +1 (555) 123-4567
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4" />
                San Francisco, CA
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />
                Available immediately
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">React</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">Next.js</Badge>
                <Badge variant="outline">Node.js</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="mr-2 w-4 h-4" />
                Edit
              </Button>
              <Button size="sm" className="flex-1">
                View Profile
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>MR</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Michael Rodriguez</CardTitle>
                    <CardDescription>Full Stack Engineer</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">Interview</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4" />
                michael.r@email.com
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4" />
                +1 (555) 987-6543
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4" />
                Austin, TX
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />2 weeks notice
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Python</Badge>
                <Badge variant="outline">Django</Badge>
                <Badge variant="outline">PostgreSQL</Badge>
                <Badge variant="outline">AWS</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="mr-2 w-4 h-4" />
                Edit
              </Button>
              <Button size="sm" className="flex-1">
                Schedule Interview
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>EK</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Emily Kim</CardTitle>
                    <CardDescription>UX/UI Designer</CardDescription>
                  </div>
                </div>
                <Badge variant="destructive">Rejected</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4" />
                emily.kim@email.com
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4" />
                +1 (555) 456-7890
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4" />
                Seattle, WA
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />
                Immediate
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Figma</Badge>
                <Badge variant="outline">Sketch</Badge>
                <Badge variant="outline">Adobe XD</Badge>
                <Badge variant="outline">Prototyping</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Trash2 className="mr-2 w-4 h-4" />
                Remove
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Archive
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Form Example */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Candidate</CardTitle>
            <CardDescription>
              Enter candidate information to add them to your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@email.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position Applied For</Label>
                <Input id="position" placeholder="Senior Frontend Developer" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input
                  id="skills"
                  placeholder="React, TypeScript, Node.js, PostgreSQL"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Add Candidate</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  ),
};

export const ComponentShowcase: Story = {
  render: () => (
    <div className="bg-background p-8 min-h-dvh">
      <div className="space-y-12 mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="mb-4 font-bold text-4xl">UI Component Showcase</h1>
          <p className="text-muted-foreground text-lg">
            Explore all components in both light and dark themes
          </p>
        </div>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="glass">Glass</Button>
          </div>
          <div className="flex gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        <Separator />

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <Separator />

        {/* Avatars */}
        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Avatars</h2>
          <div className="flex items-center gap-4">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">S</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Avatar className="w-12 h-12">
              <AvatarFallback>L</AvatarFallback>
            </Avatar>
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-lg">XL</AvatarFallback>
            </Avatar>
          </div>
        </section>

        <Separator />

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Inputs</h2>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Default Input</Label>
              <Input placeholder="Enter text..." />
            </div>
            <div className="space-y-2">
              <Label>Email Input</Label>
              <div className="relative">
                <Mail className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="Enter email..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Search Input</Label>
              <div className="relative">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Cards</h2>
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>This is a simple card example</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Card content goes here. This showcases the glass morphism
                  effect and Vision Pro styling.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>Card with footer actions</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  This card demonstrates the hover effects and interactive
                  elements.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
                <Button size="sm">Confirm</Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </div>
  ),
};
