import { Controller, Get, Patch, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current authenticated user" })
  async getCurrentUser(@CurrentUser("sub") userId: string) {
    return this.usersService.getCurrentUser(userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update current user information" })
  async updateUser(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, dto);
  }
}
