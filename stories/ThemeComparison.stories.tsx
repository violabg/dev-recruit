import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Meta, StoryObj } from "@storybook/nextjs";
import ThemeWrapper from "./ThemeWrapper";

const meta: Meta = {
  title: "Themes/Light vs Dark Comparison",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const ComponentShowcase = () => (
  <div className="space-y-8">
    <div>
      <h2 className="mb-4 font-bold text-2xl">Component Showcase</h2>
      <p className="mb-6 text-muted-foreground">
        Demonstrating how components look in both themes
      </p>
    </div>

    {/* Buttons */}
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Buttons</h3>
      <div className="flex flex-wrap gap-4">
        <Button>Primary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="glass">Glass</Button>
      </div>
    </div>

    <Separator />

    {/* Badges */}
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Badges</h3>
      <div className="flex flex-wrap gap-2">
        <Badge>Active</Badge>
        <Badge variant="secondary">Pending</Badge>
        <Badge variant="destructive">Rejected</Badge>
        <Badge variant="outline">Draft</Badge>
      </div>
    </div>

    <Separator />

    {/* Cards */}
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Cards</h3>
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src="/placeholder-user.jpg" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>John Doe</CardTitle>
                <CardDescription>Frontend Developer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="outline">React</Badge>
                <Badge variant="outline">TypeScript</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Experienced developer with 5+ years in frontend development.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Monthly overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">1,234</div>
            <div className="text-green-600 text-sm">+12% from last month</div>
          </CardContent>
        </Card>
      </div>
    </div>

    <Separator />

    {/* Form */}
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Form Elements</h3>
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter your name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter your email" />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1">Submit</Button>
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export const SideBySideComparison: Story = {
  render: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-dvh">
      {/* Light Theme */}
      <div className="border-gray-200 border-r">
        <ThemeWrapper theme="light">
          <div className="mb-4 text-center">
            <h2 className="font-bold text-xl">Light Theme</h2>
            <p className="text-muted-foreground text-sm">
              Vision Pro inspired light mode
            </p>
          </div>
          <ComponentShowcase />
        </ThemeWrapper>
      </div>

      {/* Dark Theme */}
      <div>
        <ThemeWrapper theme="dark">
          <div className="mb-4 text-center">
            <h2 className="font-bold text-xl">Dark Theme</h2>
            <p className="text-muted-foreground text-sm">
              Vision Pro inspired dark mode
            </p>
          </div>
          <ComponentShowcase />
        </ThemeWrapper>
      </div>
    </div>
  ),
};

export const LightTheme: Story = {
  render: () => (
    <ThemeWrapper theme="light">
      <ComponentShowcase />
    </ThemeWrapper>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <ThemeWrapper theme="dark">
      <ComponentShowcase />
    </ThemeWrapper>
  ),
};

export const InteractiveDemo: Story = {
  render: () => (
    <div className="bg-background p-8 min-h-dvh text-foreground">
      <div className="space-y-8 mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Theme Demo</h1>
          <p className="text-muted-foreground">
            Use the theme toggle in the Storybook toolbar to switch between
            light and dark modes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interactive Components</CardTitle>
            <CardDescription>
              These components demonstrate the Vision Pro-inspired design system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="font-bold text-2xl">125</div>
                  <div className="text-muted-foreground text-sm">
                    Active Users
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="font-bold text-2xl">89%</div>
                  <div className="text-muted-foreground text-sm">
                    Success Rate
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="font-bold text-2xl">42</div>
                  <div className="text-muted-foreground text-sm">Pending</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <Button>Primary Action</Button>
                <Button variant="outline">Secondary</Button>
                <Button variant="ghost">Tertiary</Button>
              </div>

              <div className="flex gap-2">
                <Badge>New</Badge>
                <Badge variant="secondary">Updated</Badge>
                <Badge variant="outline">Draft</Badge>
                <Badge variant="destructive">Urgent</Badge>
              </div>

              <div className="space-y-2 max-w-md">
                <Label>Search</Label>
                <Input placeholder="Type to search..." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
};
