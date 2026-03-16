import { Module } from "@nestjs/common";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { MoodController } from "./mood.controller";
import { VoiceIntroController } from "./voice-intro.controller";

@Module({
  controllers: [ProfilesController, MoodController, VoiceIntroController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
