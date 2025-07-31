import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured -- webhook verification failed', {
      status: 400,
    })
  }

  // Handle the webhook
  const { id } = evt.data
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        const { id: userId, email_addresses, first_name, last_name, image_url } = evt.data
        const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id)
        
        await prisma.user.create({
          data: {
            id: userId,
            email: primaryEmail?.email_address || '',
            name: `${first_name || ''} ${last_name || ''}`.trim() || null,
            image: image_url || null,
            emailVerified: primaryEmail?.verification?.status === 'verified' ? new Date() : null,
          },
        })
        
        console.log(`User created: ${userId}`)
        break

      case 'user.updated':
        const { id: updateUserId, email_addresses: updateEmails, first_name: updateFirstName, last_name: updateLastName, image_url: updateImageUrl } = evt.data
        const updatePrimaryEmail = updateEmails?.find(email => email.id === evt.data.primary_email_address_id)
        
        await prisma.user.update({
          where: { id: updateUserId },
          data: {
            email: updatePrimaryEmail?.email_address || '',
            name: `${updateFirstName || ''} ${updateLastName || ''}`.trim() || null,
            image: updateImageUrl || null,
            emailVerified: updatePrimaryEmail?.verification?.status === 'verified' ? new Date() : null,
          },
        })
        
        console.log(`User updated: ${updateUserId}`)
        break

      case 'user.deleted':
        if (id) {
          await prisma.user.delete({
            where: { id: id },
          })
          console.log(`User deleted: ${id}`)
        }
        break

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return new Response('Webhook handled successfully', { status: 200 })
  } catch (error) {
    console.error('Error handling webhook:', error)
    return new Response('Error handling webhook', { status: 500 })
  }
}