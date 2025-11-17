import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/placeholder-user.jpg" alt="User" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/placeholder-user.jpg" alt="John Doe" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const BrokenImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/broken-image.jpg" alt="Broken" />
      <AvatarFallback>BI</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="w-8 h-8">
        <AvatarImage src="/placeholder-user.jpg" alt="Small" />
        <AvatarFallback className="text-xs">S</AvatarFallback>
      </Avatar>

      <Avatar className="w-10 h-10">
        <AvatarImage src="/placeholder-user.jpg" alt="Default" />
        <AvatarFallback>D</AvatarFallback>
      </Avatar>

      <Avatar className="w-12 h-12">
        <AvatarImage src="/placeholder-user.jpg" alt="Large" />
        <AvatarFallback>L</AvatarFallback>
      </Avatar>

      <Avatar className="w-16 h-16">
        <AvatarImage src="/placeholder-user.jpg" alt="Extra Large" />
        <AvatarFallback className="text-lg">XL</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const UserProfiles: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src="/placeholder-user.jpg" alt="John Doe" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">John Doe</p>
          <p className="text-muted-foreground text-xs">Frontend Developer</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">Sarah Miller</p>
          <p className="text-muted-foreground text-xs">UX Designer</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>RJ</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">Robert Johnson</p>
          <p className="text-muted-foreground text-xs">Backend Engineer</p>
        </div>
      </div>
    </div>
  ),
};

export const AvatarGroup: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 font-medium text-sm">Team Members</h4>
        <div className="flex -space-x-2">
          <Avatar className="border-2 border-background">
            <AvatarImage src="/placeholder-user.jpg" alt="Member 1" />
            <AvatarFallback>M1</AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background">
            <AvatarFallback>M2</AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background">
            <AvatarFallback>M3</AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background">
            <AvatarFallback>M4</AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background">
            <AvatarFallback className="text-xs">+3</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-medium text-sm">Recent Interviewees</h4>
        <div className="flex -space-x-1">
          <Avatar className="border border-background w-8 h-8">
            <AvatarImage src="/placeholder-user.jpg" alt="Candidate 1" />
            <AvatarFallback className="text-xs">C1</AvatarFallback>
          </Avatar>
          <Avatar className="border border-background w-8 h-8">
            <AvatarFallback className="text-xs">C2</AvatarFallback>
          </Avatar>
          <Avatar className="border border-background w-8 h-8">
            <AvatarFallback className="text-xs">C3</AvatarFallback>
          </Avatar>
          <Avatar className="border border-background w-8 h-8">
            <AvatarFallback className="text-xs">C4</AvatarFallback>
          </Avatar>
          <Avatar className="border border-background w-8 h-8">
            <AvatarFallback className="text-xs">C5</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  ),
};

export const StatusIndicators: Story = {
  render: () => (
    <div className="flex gap-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar>
            <AvatarImage src="/placeholder-user.jpg" alt="Online User" />
            <AvatarFallback>ON</AvatarFallback>
          </Avatar>
          <div className="right-0 bottom-0 absolute bg-green-500 border-2 border-background rounded-full w-3 h-3"></div>
        </div>
        <span className="text-sm">Online</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar>
            <AvatarFallback>AW</AvatarFallback>
          </Avatar>
          <div className="right-0 bottom-0 absolute bg-yellow-500 border-2 border-background rounded-full w-3 h-3"></div>
        </div>
        <span className="text-sm">Away</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar>
            <AvatarFallback>OF</AvatarFallback>
          </Avatar>
          <div className="right-0 bottom-0 absolute bg-gray-400 border-2 border-background rounded-full w-3 h-3"></div>
        </div>
        <span className="text-sm">Offline</span>
      </div>
    </div>
  ),
};

export const AllAvatarTypes: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Basic Avatars</h3>
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src="/placeholder-user.jpg" alt="With Image" />
            <AvatarFallback>WI</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>FB</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="/broken.jpg" alt="Fallback" />
            <AvatarFallback>FB</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Sizes</h3>
        <div className="flex items-center gap-4">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[10px]">XS</AvatarFallback>
          </Avatar>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">S</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
          <Avatar className="w-12 h-12">
            <AvatarFallback>L</AvatarFallback>
          </Avatar>
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg">XL</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">With Status</h3>
        <div className="flex gap-4">
          <div className="relative">
            <Avatar>
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            <div className="right-0 bottom-0 absolute bg-green-500 border-2 border-background rounded-full w-3 h-3"></div>
          </div>
          <div className="relative">
            <Avatar>
              <AvatarFallback>BS</AvatarFallback>
            </Avatar>
            <div className="right-0 bottom-0 absolute bg-red-500 border-2 border-background rounded-full w-3 h-3"></div>
          </div>
        </div>
      </div>
    </div>
  ),
};
