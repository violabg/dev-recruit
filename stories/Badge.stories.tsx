import { Badge } from "@/components/ui/badge";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { Check, Star, X, Zap } from "lucide-react";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "secondary", "destructive", "outline"],
    },
    asChild: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Default",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>
        <Check className="mr-1 w-3 h-3" />
        Success
      </Badge>
      <Badge variant="destructive">
        <X className="mr-1 w-3 h-3" />
        Error
      </Badge>
      <Badge variant="secondary">
        <Star className="mr-1 w-3 h-3" />
        Featured
      </Badge>
      <Badge variant="outline">
        <Zap className="mr-1 w-3 h-3" />
        Premium
      </Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">In Review</Badge>
      <Badge>Active</Badge>
      <Badge variant="destructive">Rejected</Badge>
      <Badge variant="secondary">
        <Check className="mr-1 w-3 h-3" />
        Approved
      </Badge>
    </div>
  ),
};

export const SkillBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">React</Badge>
      <Badge variant="outline">TypeScript</Badge>
      <Badge variant="outline">Next.js</Badge>
      <Badge variant="outline">Node.js</Badge>
      <Badge variant="outline">PostgreSQL</Badge>
      <Badge variant="outline">Tailwind CSS</Badge>
      <Badge variant="outline">GraphQL</Badge>
      <Badge variant="outline">Docker</Badge>
    </div>
  ),
};

export const PriorityBadges: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="destructive">High</Badge>
      <Badge>Medium</Badge>
      <Badge variant="secondary">Low</Badge>
    </div>
  ),
};

export const InteractiveBadges: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge asChild>
        <button>Clickable</button>
      </Badge>
      <Badge asChild variant="outline">
        <a href="#" className="cursor-pointer">
          Link Badge
        </a>
      </Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Badge Variants</h3>
        <div className="flex gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">With Icons</h3>
        <div className="flex gap-2">
          <Badge>
            <Check className="mr-1 w-3 h-3" />
            Verified
          </Badge>
          <Badge variant="secondary">
            <Star className="mr-1 w-3 h-3" />
            Featured
          </Badge>
          <Badge variant="destructive">
            <X className="mr-1 w-3 h-3" />
            Failed
          </Badge>
          <Badge variant="outline">
            <Zap className="mr-1 w-3 h-3" />
            Premium
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Application Status</h3>
        <div className="flex gap-2">
          <Badge variant="outline">Applied</Badge>
          <Badge variant="secondary">Under Review</Badge>
          <Badge>Interview</Badge>
          <Badge variant="destructive">Rejected</Badge>
          <Badge>
            <Check className="mr-1 w-3 h-3" />
            Hired
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Tech Stack</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">JavaScript</Badge>
          <Badge variant="outline">TypeScript</Badge>
          <Badge variant="outline">React</Badge>
          <Badge variant="outline">Vue.js</Badge>
          <Badge variant="outline">Angular</Badge>
          <Badge variant="outline">Node.js</Badge>
          <Badge variant="outline">Python</Badge>
          <Badge variant="outline">Java</Badge>
          <Badge variant="outline">C#</Badge>
          <Badge variant="outline">Go</Badge>
        </div>
      </div>
    </div>
  ),
};
