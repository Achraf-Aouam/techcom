"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClubCardData {
  name: string;
  description: string;
  image_url: string;
  color_code: string;
}

export default function ClubCard(data: ClubCardData) {
  console.log(data.color_code);
  return (
    <Card className={`p-3 m-5 border-[${data.color_code}]`}>
      <CardHeader>
        <CardTitle>{data.name}</CardTitle>
        <img src={data.image_url} />
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  );
}
