from enum import Enum 




class UserRole(Enum): 
  SUPER_ADMIN = "SUPER_ADMIN" 
  ADMIN = "ADMIN" 
  TEAM_MEMBER = "TEAM_MEMBER" 
  
  @classmethod 
  def choices(cls): return [(role.value, role.value) for role in cls]