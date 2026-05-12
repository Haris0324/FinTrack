import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, company, position, profilePicture } = body;

    await connectToDatabase();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (position !== undefined) updateData.position = position;
    
    if (profilePicture) {
      updateData.profilePicture = await uploadToCloudinary(profilePicture);
    } else if (profilePicture === "") {
      updateData.profilePicture = ""; // Handle removal
    }

    const user = await User.findByIdAndUpdate(
      (session.user as any).id,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log Activity
    try {
      const headerList = await headers();
      const ip = headerList.get('x-forwarded-for') || 'Unknown IP';
      await ActivityLog.create({
        userId: user._id,
        action: 'Updated profile information',
        status: 'Success',
        type: 'success',
        ip
      });
    } catch(err) {
      console.error("Failed to log activity:", err);
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        name: user.name,
        phone: user.phone,
        company: user.company,
        position: user.position,
        profilePicture: user.profilePicture
      }
    });

  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
