# MWC Message Library (preserved)


## 02. Non-Booked Recovery

**EMAIL · T+1d** · _spec/draft_
Subject: Your consultation isn't booked yet

> Hi {{contact.first_name}},
> 
> You're one step away. Pick a time that works and we'll take care of the rest.
> 
> bookmwc.com
> 
> Men's Wellness, 866-344-4955

**SMS · T+1h** · _spec/draft_

> Hi {{contact.first_name}}, it's Men's Wellness. You started booking a consultation but didn't finish. Grab a time here: bookmwc.com. Men's Wellness, 866-344-4955

**SMS · T+4h** · _spec/draft_

> {{contact.first_name}}, still want to get scheduled? Same-week times are open at your nearest center: bookmwc.com. Men's Wellness, 866-344-4955

**SMS · T+3d** · _spec/draft_

> Last note from us, {{contact.first_name}}. your nearest center still has openings this week: bookmwc.com. Men's Wellness, 866-344-4955


## 03. Appointment Reminders

**SMS · T-24h** · _spec/draft_

> Hi {{contact.first_name}}, reminder of your Men's Wellness visit tomorrow at {{appointment.time}}, {{appointment.location}}. Reply if you need to reschedule. Men's Wellness, 866-344-4955

**SMS · T-4h** · _spec/draft_

> See you today at {{appointment.time}}, {{contact.first_name}}. {{appointment.location}}. Men's Wellness, 866-344-4955

**SMS · T-1h** · _spec/draft_

> Your visit is in about an hour, {{contact.first_name}}. We're at {{appointment.address}}. Men's Wellness, 866-344-4955


## 04. Medical Intake Chase

**EMAIL · T+2d** · _spec/draft_
Subject: Finish your medical intake before your visit

> Hi {{contact.first_name}},
> 
> Your provider prepares from your intake answers, so please complete it before you arrive. It takes about 5 minutes.
> 
> bookmwc.com/intake
> 
> Men's Wellness, 866-344-4955

**SMS · On booking** · _spec/draft_

> Hi {{contact.first_name}}, thanks for booking with Men's Wellness. Please complete your medical intake before your visit so we can prepare: bookmwc.com/intake. Men's Wellness, 866-344-4955

**SMS · T+1d** · _spec/draft_

> {{contact.first_name}}, your intake isn't finished yet. It takes about 5 minutes and helps your provider get ready: bookmwc.com/intake. Men's Wellness, 866-344-4955

**SMS · Morning of** · _spec/draft_

> See you today, {{contact.first_name}}. Please finish your intake before you arrive: bookmwc.com/intake. Men's Wellness, 866-344-4955


## 06. Post-Visit Won — Onboarding & Review

**EMAIL · Day 0** · _spec/draft_
Subject: Welcome to Men's Wellness

> Hi {{contact.first_name}},
> 
> Welcome aboard. Here's what to expect next and how to reach your care team.
> 
> Men's Wellness, 866-344-4955

**SMS · Day 0** · _spec/draft_

> Welcome to Men's Wellness, {{contact.first_name}}! Your care team is set. Anything you need before you start, just reply. Men's Wellness, 866-344-4955

**SMS · Day 2** · _spec/draft_

> {{contact.first_name}}, how was your experience with Men's Wellness? A quick rating helps us a lot: {{review_link}}. Men's Wellness, 866-344-4955


## 07. Post-Visit No-Sale Nurture

**SMS · Cost** · _spec/draft_

> {{contact.first_name}}, we hear you on cost. There are flexible options most members don't realize. want me to walk you through them? Men's Wellness, 866-344-4955

**SMS · Timing** · _spec/draft_

> No rush, {{contact.first_name}}. When you're ready to revisit your plan, we're here. Men's Wellness, 866-344-4955

**SMS · Partner** · _spec/draft_

> {{contact.first_name}}, happy to share info you can review with your partner. just reply and I'll send it. Men's Wellness, 866-344-4955


## 08. No-Show & Cancellation Recovery

**EMAIL · +1d** · _spec/draft_
Subject: Let's get you rescheduled

> Hi {{contact.first_name}},
> 
> We'd still love to see you. Here's the link to grab a new time at your nearest center.
> 
> bookmwc.com
> 
> Men's Wellness, 866-344-4955

**SMS · No-show +1h** · _spec/draft_

> {{contact.first_name}}, we missed you today at Men's Wellness. Let's get you rescheduled. pick a new time: bookmwc.com. Men's Wellness, 866-344-4955

**SMS · Cancel +0** · _spec/draft_

> No problem, {{contact.first_name}}. When you're ready, rebooking takes a minute: bookmwc.com. Men's Wellness, 866-344-4955


## 09. Long-Term Nurture

**EMAIL · Warm** · _spec/draft_
Subject: Still thinking it over?

> Hi {{contact.first_name}},
> 
> Whenever the timing's right, we're here to help. Here's what membership looks like.
> 
> Men's Wellness, 866-344-4955

**SMS · Hot** · _spec/draft_

> {{contact.first_name}}, ready when you are. your nearest Men's Wellness center has openings this week: bookmwc.com. 866-344-4955


## 10. Feedback Survey

**SMS · Post-visit** · _spec/draft_

> Thanks for visiting Men's Wellness, {{contact.first_name}}. One quick question on how we did: {{survey_link}}. Men's Wellness, 866-344-4955


## 11. Compliance & Errors

**SMS · STOP** · _spec/draft_

> You're unsubscribed and won't get further texts from Men's Wellness. Reply START to resume.


## 14. Ambassador Program

**SMS · Welcome** · _spec/draft_

> Welcome to the Men's Wellness Ambassador program, {{contact.first_name}}! Your referral link: {{ambassador_link}}. 866-344-4955


## 16. Comms Edge

**SMS · Missed call** · _spec/draft_

> Sorry we missed your call! This is Men's Wellness. how can we help? Reply here and we'll get right back to you. 866-344-4955
