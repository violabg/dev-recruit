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
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content area with some example text to show how it looks.</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAvatar: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src="/placeholder-user.jpg" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>John Doe</CardTitle>
            <CardDescription>Software Engineer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p>
          Experienced developer with expertise in React, TypeScript, and modern
          web technologies.
        </p>
        <div className="flex gap-2 mt-4">
          <Badge variant="secondary">React</Badge>
          <Badge variant="secondary">TypeScript</Badge>
          <Badge variant="secondary">Next.js</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          View Profile
        </Button>
        <Button className="flex-1">Contact</Button>
      </CardFooter>
    </Card>
  ),
};

export const Statistics: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="font-bold text-2xl">1,234</CardTitle>
        <CardDescription>Total Applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          <div className="flex justify-between">
            <span>This month</span>
            <span className="text-green-600">+12%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const NotificationCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>New Interview Scheduled</CardTitle>
          <Badge>New</Badge>
        </div>
        <CardDescription>2 minutes ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          Your interview with Sarah Johnson for the Frontend Developer position
          has been scheduled for tomorrow at 2:00 PM.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm">
          Dismiss
        </Button>
        <Button size="sm">View Details</Button>
      </CardFooter>
    </Card>
  ),
};

export const ProductCard: Story = {
  render: () => (
    <Card className="w-80">
      <div className="bg-muted rounded-t-2xl aspect-video" />
      <CardHeader>
        <CardTitle>Premium Plan</CardTitle>
        <CardDescription>
          <span className="font-bold text-2xl">$29</span>
          <span className="text-muted-foreground">/month</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li>✓ Unlimited interviews</li>
          <li>✓ Advanced analytics</li>
          <li>✓ Custom branding</li>
          <li>✓ Priority support</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Upgrade Now</Button>
      </CardFooter>
    </Card>
  ),
};

export const AllCardTypes: Story = {
  render: () => (
    <div className="gap-8 grid p-8">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Card Variations</h3>
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
              <CardDescription>
                Simple card with title and description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Basic content goes here</p>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>With Footer</CardTitle>
              <CardDescription>Card with action buttons</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Content with footer actions</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <Button size="sm">Confirm</Button>
            </CardFooter>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>Hover effects and interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                This card has hover effects applied via the Vision Pro styling
                system
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  ),
};
