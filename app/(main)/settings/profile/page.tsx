/**
 * My Profile Page
 * Allows users to view and update their profile information
 */

import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { ProfileForm } from './profile-form'
import { getProfileExtended } from './actions'

export default async function ProfilePage() {
  const [profile, extendedData] = await Promise.all([
    getUserProfile(),
    getProfileExtended(),
  ])

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          View and update your profile information
        </p>
      </div>

      <ProfileForm profile={profile} extendedData={extendedData} />
    </div>
  )
}
