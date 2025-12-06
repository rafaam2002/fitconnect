import { MikroORM } from "@mikro-orm/core";
import { Company } from "../entities/Company";
import { PushToken } from "../entities/PushToken";
import { User } from "../entities/User";
import { UserRole } from "../entities/UserRole";
import {
  admitUserToCompany,
  requestJoinCompany,
} from "../graphql/resolvers/company.resolver";
import config from "../mikro-orm.config";
import { UserRoleEnum } from "../types/enums";

async function verify() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  try {
    console.log("Creating test data...");

    // Create Company
    const company = new Company({
      name: "Test Company " + Date.now(),
      email: "test@company.com",
      phoneNumber: "123456789",
      address: "Test Address",
    });

    // Create Boss User
    const bossUser = new User({
      name: "Boss",
      surname: "User",
      nickname: "boss" + Date.now(),
      email: "boss" + Date.now() + "@test.com",
      password: "password",
    } as User);

    // Create Applicant User
    const applicantUser = new User({
      name: "Applicant",
      surname: "User",
      nickname: "applicant" + Date.now(),
      email: "applicant" + Date.now() + "@test.com",
      password: "password",
    } as User);

    await em.persistAndFlush([company, bossUser, applicantUser]);

    // Assign Boss Role
    const bossRole = new UserRole(bossUser, company, UserRoleEnum.BOSS);
    await em.persistAndFlush(bossRole);

    // Create Push Token for Boss
    const pushToken = new PushToken();
    pushToken.token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
    pushToken.user = bossUser;
    await em.persistAndFlush(pushToken);

    console.log("Test data created.");
    console.log(`Company ID: ${company.id}`);
    console.log(`Boss ID: ${bossUser.id}`);
    console.log(`Applicant ID: ${applicantUser.id}`);

    // Test 1: Request Join
    console.log("\nTesting requestJoinCompany...");
    const requestResult = await requestJoinCompany(
      null,
      { companyId: company.id },
      { em: em.fork(), currentUser: applicantUser } as any
    );
    console.log("Result:", requestResult);

    // Verify pending status
    const applicantAfterRequest = await em.findOne(
      User,
      { id: applicantUser.id },
      { populate: ["pendingCompanies"] }
    );
    const isPending = applicantAfterRequest?.pendingCompanies.contains(company);
    console.log("Is Applicant Pending?", isPending);

    if (!isPending) throw new Error("Applicant should be pending");

    // Test 2: Admit User
    console.log("\nTesting admitUserToCompany...");
    const admitResult = await admitUserToCompany(
      null,
      { companyId: company.id, userId: applicantUser.id },
      { em: em.fork(), currentUser: bossUser } as any
    );
    console.log("Result:", admitResult);

    // Verify admission
    const applicantAfterAdmission = await em.findOne(
      User,
      { id: applicantUser.id },
      { populate: ["pendingCompanies", "companies"] }
    );
    const isPendingAfter =
      applicantAfterAdmission?.pendingCompanies.contains(company);
    const isMember = applicantAfterAdmission?.companies.contains(company);

    // Check UserRole
    const userRole = await em.findOne(UserRole, {
      user: applicantUser,
      company: company,
    });

    console.log("Is Applicant Pending (should be false)?", isPendingAfter);
    console.log("Is Applicant Member (should be true)?", isMember);
    console.log("Has UserRole (should be true)?", !!userRole);
    console.log("UserRole:", userRole?.role);

    if (isPendingAfter)
      throw new Error("Applicant should not be pending anymore");
    if (!isMember) throw new Error("Applicant should be a member");
    if (!userRole) throw new Error("Applicant should have a UserRole");
    if (userRole.role !== UserRoleEnum.STANDARD)
      throw new Error("UserRole should be STANDARD");

    console.log("\nVERIFICATION SUCCESSFUL!");
  } catch (error) {
    console.error("\nVERIFICATION FAILED:", error);
  } finally {
    await orm.close();
  }
}

verify();
